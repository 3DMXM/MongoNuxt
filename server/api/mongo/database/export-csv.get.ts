import { getClient } from '@@/server/utils/mongo'
import { Readable, Transform } from 'stream'
import { createGzip } from 'zlib'

// CSV导出专用配置
const CSV_BATCH_SIZE = 5000
const MAX_CSV_FIELDS = 100 // 限制CSV字段数量，避免性能问题

export default defineEventHandler(async (event) => {
    const q = getQuery(event) as any
    const dbName = q?.db
    const collectionName = q?.collection
    const compress = q?.compress !== 'false'
    const delimiter = q?.delimiter || ','
    const includeHeader = q?.header !== 'false'
    const maxFields = parseInt(q?.maxFields) || MAX_CSV_FIELDS

    if (!dbName || !collectionName) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing db or collection query parameters'
        })
    }

    try {
        const client = getClient()
        const db = client.db(dbName)
        const collection = db.collection(collectionName)

        // 验证集合存在
        const collExists = await db.listCollections({ name: collectionName }).hasNext()
        if (!collExists) {
            throw createError({ statusCode: 404, statusMessage: 'Collection not found' })
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `${dbName}-${collectionName}-${timestamp}.csv${compress ? '.gz' : ''}`

        setHeader(event, 'Content-Type', compress ? 'application/gzip' : 'text/csv')
        if (compress) {
            setHeader(event, 'Content-Encoding', 'gzip')
        }
        setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
        setHeader(event, 'Cache-Control', 'no-cache')

        // 分析文档结构，确定CSV字段
        async function analyzeSchema() {
            const sampleSize = 100
            const sampleDocs = await collection.find({})
                .limit(sampleSize)
                .toArray()

            const fieldSet = new Set<string>()

            function extractFields(obj: any, prefix = '') {
                if (fieldSet.size >= maxFields) return

                for (const [key, value] of Object.entries(obj)) {
                    if (fieldSet.size >= maxFields) break

                    const fieldName = prefix ? `${prefix}.${key}` : key

                    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                        // 递归处理嵌套对象，但限制深度
                        if (prefix.split('.').length < 3) {
                            extractFields(value, fieldName)
                        }
                    } else {
                        fieldSet.add(fieldName)
                    }
                }
            }

            sampleDocs.forEach(doc => extractFields(doc))
            return Array.from(fieldSet).slice(0, maxFields)
        }

        const fields = await analyzeSchema()

        // CSV值格式化函数
        function formatCsvValue(value: any): string {
            if (value === null || value === undefined) return ''

            if (value instanceof Date) {
                return value.toISOString()
            }

            if (typeof value === 'object') {
                return JSON.stringify(value).replace(/"/g, '""')
            }

            const str = String(value)
            // 如果包含分隔符、换行符或引号，需要用引号包围并转义
            if (str.includes(delimiter) || str.includes('\n') || str.includes('\r') || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`
            }

            return str
        }

        // 从对象中提取字段值
        function extractFieldValue(obj: any, fieldPath: string): any {
            const parts = fieldPath.split('.')
            let current = obj

            for (const part of parts) {
                if (current && typeof current === 'object' && part in current) {
                    current = current[part]
                } else {
                    return null
                }
            }

            return current
        }

        // 流式CSV生成器
        async function* generateCsv() {
            // 输出CSV头部
            if (includeHeader) {
                yield fields.map(field => formatCsvValue(field)).join(delimiter) + '\n'
            }

            // 分批处理文档
            let skip = 0

            while (true) {
                const cursor = collection.find({}, {
                    skip,
                    limit: CSV_BATCH_SIZE,
                    batchSize: Math.min(CSV_BATCH_SIZE, 1000),
                    readPreference: 'secondaryPreferred'
                })

                const batch = await cursor.toArray()
                await cursor.close()

                if (batch.length === 0) break

                // 转换为CSV行
                for (const doc of batch) {
                    const row = fields.map(field => {
                        const value = extractFieldValue(doc, field)
                        return formatCsvValue(value)
                    }).join(delimiter)

                    yield row + '\n'
                }

                skip += CSV_BATCH_SIZE

                // 检查客户端连接
                if (event.node.req.destroyed) {
                    return
                }

                // 让出控制权
                await new Promise(resolve => setImmediate(resolve))
            }
        }

        // 创建高性能转换流
        const csvTransform = new Transform({
            objectMode: false,
            highWaterMark: 128 * 1024, // 128KB缓冲区
            transform(chunk, encoding, callback) {
                // 异步处理，优化性能
                process.nextTick(() => {
                    callback(null, chunk)
                })
            }
        })

        const sourceStream = Readable.from(generateCsv())
        let finalStream = sourceStream.pipe(csvTransform)

        // 可选压缩
        if (compress) {
            const gzipStream = createGzip({
                level: 4, // 较低压缩级别，优化速度
                chunkSize: 64 * 1024,
                windowBits: 15,
                memLevel: 6
            })
            finalStream = finalStream.pipe(gzipStream)
        }

        // 错误处理
        const cleanup = () => {
            sourceStream.destroy()
            csvTransform.destroy()
        }

        event.node.req.on('close', cleanup)
        event.node.req.on('error', cleanup)

        return await sendStream(event, finalStream)

    } catch (err: any) {
        console.error('CSV export error:', err)
        throw createError({
            statusCode: 500,
            statusMessage: `CSV export failed: ${err?.message || String(err)}`
        })
    }
})
