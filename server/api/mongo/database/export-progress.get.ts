import { getClient } from '@@/server/utils/mongo'
import { createError, getQuery } from 'h3'

// 进度更新频率控制
const PROGRESS_UPDATE_INTERVAL = 100 // 每100个文档更新一次进度
const HEARTBEAT_INTERVAL = 5000 // 心跳间隔5秒

export default defineEventHandler(async (event) => {
    const q = getQuery(event) as any
    const dbName = q?.db
    if (!dbName) throw createError({ statusCode: 400, statusMessage: 'Missing db query parameter' })

    // set SSE headers
    const res = event.node.res
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    setHeader(event, 'Access-Control-Allow-Headers', 'Cache-Control')

    // helper to send SSE event
    function sendEvent(eventName: string, data: any) {
        try {
            if (!res.destroyed && res.writable) {
                res.write(`event: ${eventName}\n`)
                res.write(`data: ${JSON.stringify(data)}\n\n`)
            }
        } catch (e) {
            console.warn('SSE write error:', e)
        }
    }

    // 设置心跳机制，保持连接活跃
    const heartbeatTimer = setInterval(() => {
        sendEvent('heartbeat', { timestamp: Date.now() })
    }, HEARTBEAT_INTERVAL)

    // 清理函数
    const cleanup = () => {
        clearInterval(heartbeatTimer)
        try {
            if (!res.destroyed) {
                res.end()
            }
        } catch (e) {
            console.warn('Cleanup error:', e)
        }
    }

    // 监听客户端断开
    event.node.req.on('close', cleanup)
    event.node.req.on('error', cleanup)

    const client = getClient()
    const db = client.db(dbName)

    try {
        const startTime = Date.now()
        sendEvent('start', { dbName, startTime })

        const collections = await db.listCollections().toArray()
        const collectionNames = collections.map(c => c.name)

        sendEvent('collectionsFound', {
            collections: collectionNames,
            count: collections.length
        })

        // 并行计算文档数量，提升性能
        const countPromises = collections.map(async (c) => {
            try {
                const count = await db.collection(c.name).estimatedDocumentCount()
                sendEvent('collectionCount', { collection: c.name, count })
                return { name: c.name, count }
            } catch (err) {
                console.warn(`Failed to count documents in ${c.name}:`, err)
                sendEvent('collectionCount', { collection: c.name, count: 0, error: true })
                return { name: c.name, count: 0 }
            }
        })

        const collCounts = await Promise.all(countPromises)
        const total = collCounts.reduce((sum, c) => sum + c.count, 0)

        sendEvent('init', {
            total,
            collections: collectionNames,
            estimatedSize: total,
            performance: {
                countingTime: Date.now() - startTime
            }
        })

        let processed = 0
        let lastUpdateTime = Date.now()

        // 优化的进度跟踪
        for (const c of collections) {
            const name = c.name
            const coll = db.collection(name)
            const collInfo = collCounts.find(cc => cc.name === name)
            const collTotal = collInfo?.count || 0

            const collStartTime = Date.now()
            sendEvent('collectionStart', {
                name,
                count: collTotal,
                startTime: collStartTime
            })

            if (collTotal === 0) {
                sendEvent('collectionDone', {
                    name,
                    processed,
                    total,
                    duration: Date.now() - collStartTime
                })
                continue
            }

            // 使用优化的查询选项
            const cursor = coll.find({}, {
                projection: { _id: 1 },
                batchSize: 1000, // 增加批大小
                noCursorTimeout: false,
                readPreference: 'secondaryPreferred'
            })

            let seen = 0
            let batchProcessed = 0
            const batchSize = 1000

            try {
                // 批量处理文档ID
                while (await cursor.hasNext()) {
                    // 处理一个批次
                    const batch = []
                    for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
                        await cursor.next()
                        batch.push(i)
                    }

                    seen += batch.length
                    processed += batch.length
                    batchProcessed += batch.length

                    // 控制进度更新频率
                    const now = Date.now()
                    if (batchProcessed >= PROGRESS_UPDATE_INTERVAL ||
                        processed === total ||
                        now - lastUpdateTime > 2000) { // 最多2秒更新一次

                        const collectionProgress = collTotal > 0 ? (seen / collTotal) * 100 : 100
                        const overallProgress = total > 0 ? (processed / total) * 100 : 100

                        sendEvent('progress', {
                            processed,
                            total,
                            collection: name,
                            collectionProcessed: seen,
                            collectionTotal: collTotal,
                            collectionProgress: Math.round(collectionProgress * 100) / 100,
                            overallProgress: Math.round(overallProgress * 100) / 100,
                            rate: batchProcessed / ((now - lastUpdateTime) / 1000), // 文档/秒
                            timestamp: now
                        })

                        batchProcessed = 0
                        lastUpdateTime = now
                    }

                    // 检查客户端连接状态
                    if (event.node.req.destroyed) {
                        await cursor.close()
                        cleanup()
                        return
                    }

                    // 让出控制权，避免阻塞事件循环
                    await new Promise(resolve => setImmediate(resolve))
                }
            } finally {
                await cursor.close()
            }

            const collDuration = Date.now() - collStartTime
            sendEvent('collectionDone', {
                name,
                processed,
                total,
                collectionProcessed: seen,
                duration: collDuration,
                rate: seen / (collDuration / 1000) // 文档/秒
            })
        }

        const totalDuration = Date.now() - startTime
        sendEvent('done', {
            processed,
            total,
            duration: totalDuration,
            avgRate: processed / (totalDuration / 1000), // 平均文档/秒
            performance: {
                totalTime: totalDuration,
                documentsPerSecond: Math.round((processed / (totalDuration / 1000)) * 100) / 100
            }
        })

        cleanup()
    } catch (err: any) {
        console.error('Export progress error:', err)
        sendEvent('error', {
            message: err?.message || String(err),
            timestamp: Date.now()
        })
        cleanup()
    }
})
