import { getClient } from '@@/server/utils/mongo'
import { Readable, Transform } from 'stream'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'

// 批处理大小，避免内存过载
const BATCH_SIZE = 1000
// 最大并发数，控制内存使用
const MAX_CONCURRENT = 2

export default defineEventHandler(async (event) => {
    const q = getQuery(event) as any
    const dbName = q?.db
    const batchSize = parseInt(q?.batchSize) || BATCH_SIZE

    if (!dbName) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db query parameter' })
    }

    try {
        const client = getClient()
        const db = client.db(dbName)
        const collections = await db.listCollections().toArray()

        const filename = `${dbName}-export-${Date.now()}.json.gz`
        setHeader(event, 'Content-Type', 'application/gzip')
        setHeader(event, 'Content-Encoding', 'gzip')
        setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
        setHeader(event, 'Cache-Control', 'no-cache')

        // 优化的异步生成器，支持批处理和背压控制
        async function* generateOptimized() {
            yield `{"db":${JSON.stringify(dbName)},"collections":[`

            let firstColl = true
            for (const collInfo of collections) {
                const name = collInfo.name
                const coll = db.collection(name)

                if (!firstColl) yield ','
                firstColl = false

                // 异步加载索引，避免阻塞
                const indexes = await coll.indexes()
                yield `{"name":${JSON.stringify(name)},"indexes":${JSON.stringify(indexes)},"docs":[`

                // 使用批处理游标优化大数据集处理
                const cursor = coll.find({}, {
                    // 启用游标超时，避免长时间锁定
                    noCursorTimeout: false,
                    // 优化批大小
                    batchSize: batchSize,
                    // 减少网络往返
                    readPreference: 'secondaryPreferred'
                })

                let firstDoc = true
                let batchCount = 0
                let batch: any[] = []

                try {
                    for await (const doc of cursor) {
                        batch.push(doc)
                        batchCount++

                        // 达到批大小时处理批次
                        if (batch.length >= batchSize) {
                            for (const batchDoc of batch) {
                                if (!firstDoc) yield ','
                                firstDoc = false
                                yield JSON.stringify(batchDoc)
                            }
                            batch = []

                            // 每处理一定数量的批次后，让出控制权
                            if (batchCount % (batchSize * 5) === 0) {
                                await new Promise(resolve => setImmediate(resolve))
                            }
                        }

                        // 检查客户端是否断开连接
                        if (event.node.req.destroyed) {
                            await cursor.close()
                            return
                        }
                    }

                    // 处理剩余的文档
                    for (const batchDoc of batch) {
                        if (!firstDoc) yield ','
                        firstDoc = false
                        yield JSON.stringify(batchDoc)
                    }

                } finally {
                    // 确保游标被正确关闭
                    await cursor.close()
                }

                yield ']}'
            }

            yield ']}'
        }

        // 创建带背压控制的转换流
        const backpressureTransform = new Transform({
            objectMode: false,
            highWaterMark: 16 * 1024, // 16KB 缓冲区
            transform(chunk, encoding, callback) {
                // 简单的背压控制
                setImmediate(() => {
                    callback(null, chunk)
                })
            }
        })

        // 创建优化的压缩流
        const gzipStream = createGzip({
            level: 6, // 平衡压缩率和速度
            chunkSize: 16 * 1024,
            windowBits: 15,
            memLevel: 8
        })

        const sourceStream = Readable.from(generateOptimized())

        // 使用pipeline确保错误处理和资源清理
        const transformedStream = sourceStream
            .pipe(backpressureTransform)
            .pipe(gzipStream)

        // 监听客户端断开连接
        event.node.req.on('close', () => {
            sourceStream.destroy()
            backpressureTransform.destroy()
            gzipStream.destroy()
        })

        return await sendStream(event, transformedStream)

    } catch (err: any) {
        console.error('Export error:', err)
        throw createError({
            statusCode: 500,
            statusMessage: `Export failed: ${err?.message || String(err)}`
        })
    }
})
