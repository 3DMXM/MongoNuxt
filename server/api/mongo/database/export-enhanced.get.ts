import { getClient } from '@@/server/utils/mongo'
import { Readable, Transform } from 'stream'
import { createGzip } from 'zlib'
import { registerExport, isExportCancelled, completeExport, updateExportProgress } from './export-cancel.post'

// 分片导出配置
const DEFAULT_CHUNK_SIZE = 10000 // 每个分片的文档数量
const MAX_MEMORY_USAGE = 100 * 1024 * 1024 // 100MB 内存限制

export default defineEventHandler(async (event) => {
    const q = getQuery(event) as any
    const dbName = q?.db
    const collections = q?.collections ? q.collections.split(',') : null
    const chunkSize = parseInt(q?.chunkSize) || DEFAULT_CHUNK_SIZE
    const compress = q?.compress !== 'false'
    const format = q?.format || 'json' // json, bson, csv

    if (!dbName) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db query parameter' })
    }

    const exportId = `export_${dbName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    registerExport(exportId)

    try {
        const client = getClient()
        const db = client.db(dbName)

        // 获取要导出的集合
        const allCollections = await db.listCollections().toArray()
        const targetCollections = collections
            ? allCollections.filter(c => collections.includes(c.name))
            : allCollections

        if (targetCollections.length === 0) {
            throw createError({ statusCode: 404, statusMessage: 'No collections found' })
        }

        // 预计算总文档数
        let totalDocuments = 0
        const collectionCounts: { [key: string]: number } = {}

        for (const collInfo of targetCollections) {
            try {
                const count = await db.collection(collInfo.name).estimatedDocumentCount()
                collectionCounts[collInfo.name] = count
                totalDocuments += count
            } catch (err) {
                console.warn(`Failed to count documents in ${collInfo.name}:`, err)
                collectionCounts[collInfo.name] = 0
            }
        }

        // 初始化进度跟踪
        updateExportProgress(exportId, {
            processed: 0,
            total: totalDocuments,
            currentCollection: '',
            collections: targetCollections.map(c => c.name)
        })

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `${dbName}-${format}-${timestamp}.${compress ? (format + '.gz') : format}`

        // 设置响应头
        setHeader(event, 'Content-Type', compress ? 'application/gzip' : 'application/json')
        if (compress) {
            setHeader(event, 'Content-Encoding', 'gzip')
        }
        setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
        setHeader(event, 'Cache-Control', 'no-cache')
        setHeader(event, 'X-Export-ID', exportId)

        // 内存使用监控
        let memoryUsage = 0

        // 优化的流式导出生成器
        async function* generateStreamingExport() {
            let processedDocuments = 0

            try {
                // 数据库元信息
                const dbStats = await db.stats().catch(() => null)
                const metadata = {
                    database: dbName,
                    exportId,
                    timestamp: new Date().toISOString(),
                    format,
                    collections: targetCollections.length,
                    chunkSize,
                    totalDocuments,
                    stats: dbStats
                }

                if (format === 'json') {
                    yield JSON.stringify({ metadata }) + '\n'
                    yield '{"collections":[\n'
                }

                let isFirstCollection = true

                for (const collInfo of targetCollections) {
                    // 检查是否被取消
                    if (isExportCancelled(exportId)) {
                        yield `\n],"status":"cancelled","cancelledAt":"${new Date().toISOString()}"}`
                        return
                    }

                    const collName = collInfo.name
                    const collection = db.collection(collName)

                    // 更新当前处理的集合
                    updateExportProgress(exportId, {
                        processed: processedDocuments,
                        total: totalDocuments,
                        currentCollection: collName
                    })

                    // 获取集合统计信息  
                    const collStats = await db.command({ collStats: collName }).catch(() => null)
                    const estimatedCount = collectionCounts[collName] || 0

                    if (format === 'json') {
                        if (!isFirstCollection) yield ',\n'
                        isFirstCollection = false

                        const collMetadata = {
                            name: collName,
                            stats: collStats,
                            estimatedCount,
                            indexes: await collection.indexes().catch(() => [])
                        }

                        yield JSON.stringify({
                            collection: collMetadata,
                            documents: []
                        }, null, 2).slice(0, -4) // 移除结尾的 ]}
                    }

                    // 分片处理大集合
                    let skip = 0
                    let processedInCollection = 0

                    while (true) {
                        // 检查取消状态
                        if (isExportCancelled(exportId)) {
                            return
                        }

                        // 内存使用检查
                        const memUsage = process.memoryUsage()
                        if (memUsage.heapUsed > MAX_MEMORY_USAGE) {
                            // 强制垃圾回收（如果可用）
                            if (global.gc) {
                                global.gc()
                            }
                            // 短暂暂停，允许内存释放
                            await new Promise(resolve => setTimeout(resolve, 100))
                        }

                        // 获取一个分片的数据
                        const cursor = collection.find({}, {
                            skip,
                            limit: chunkSize,
                            batchSize: Math.min(chunkSize, 1000),
                            readPreference: 'secondaryPreferred',
                            noCursorTimeout: false
                        })

                        const chunk = await cursor.toArray()
                        await cursor.close()

                        if (chunk.length === 0) break

                        // 输出文档
                        for (let i = 0; i < chunk.length; i++) {
                            if (processedInCollection > 0 || i > 0) {
                                yield ',\n'
                            }

                            if (format === 'json') {
                                yield '      ' + JSON.stringify(chunk[i])
                            }
                        }

                        processedInCollection += chunk.length
                        processedDocuments += chunk.length
                        skip += chunkSize

                        // 更新进度
                        updateExportProgress(exportId, {
                            processed: processedDocuments,
                            total: totalDocuments,
                            currentCollection: collName
                        })

                        // 让出控制权
                        await new Promise(resolve => setImmediate(resolve))
                    }

                    if (format === 'json') {
                        yield '\n    ]\n  }'
                    }
                }

                if (format === 'json') {
                    yield `\n],"exportCompleted":"${new Date().toISOString()}","totalCollections":${targetCollections.length},"totalDocuments":${processedDocuments}}`
                }

            } catch (error: any) {
                console.error('Export generation error:', error)
                if (format === 'json') {
                    yield `\n],"error":"${error?.message || String(error)}","errorAt":"${new Date().toISOString()}"}`
                }
                throw error
            }
        }

        // 创建内存优化的转换流
        const memoryOptimizedTransform = new Transform({
            objectMode: false,
            highWaterMark: 64 * 1024, // 64KB 缓冲区
            transform(chunk, encoding, callback) {
                // 更新内存使用统计
                memoryUsage += chunk.length

                // 异步处理，避免阻塞
                setImmediate(() => {
                    callback(null, chunk)
                })
            }
        })

        const sourceStream = Readable.from(generateStreamingExport())
        let finalStream = sourceStream.pipe(memoryOptimizedTransform)

        // 可选压缩
        if (compress) {
            const gzipStream = createGzip({
                level: 6,
                chunkSize: 32 * 1024,
                windowBits: 15,
                memLevel: 7 // 降低内存使用
            })
            finalStream = finalStream.pipe(gzipStream)
        }

        // 错误处理和清理
        const cleanup = () => {
            completeExport(exportId)
            sourceStream.destroy()
            memoryOptimizedTransform.destroy()
        }

        // 监听客户端断开
        event.node.req.on('close', cleanup)
        event.node.req.on('error', cleanup)

        // 流结束时清理
        finalStream.on('end', cleanup)
        finalStream.on('error', cleanup)

        return await sendStream(event, finalStream)

    } catch (err: any) {
        completeExport(exportId)
        console.error('Enhanced export error:', err)
        throw createError({
            statusCode: 500,
            statusMessage: `Export failed: ${err?.message || String(err)}`
        })
    }
})
