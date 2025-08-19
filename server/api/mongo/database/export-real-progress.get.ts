import { createError, getQuery } from 'h3'
import { getExportProgress } from './export-cancel.post'

export default defineEventHandler(async (event) => {
    const q = getQuery(event) as any
    const exportId = q?.exportId

    if (!exportId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing exportId query parameter' })
    }

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

    // 清理函数
    const cleanup = () => {
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

    try {
        sendEvent('start', { exportId })

        // 定期发送进度更新
        const progressInterval = setInterval(() => {
            const progress = getExportProgress(exportId)

            if (!progress) {
                // 导出已完成或不存在
                sendEvent('done', { exportId })
                clearInterval(progressInterval)
                cleanup()
                return
            }

            const overallProgress = progress.total > 0
                ? Math.round((progress.processed / progress.total) * 100 * 100) / 100
                : 0

            sendEvent('progress', {
                exportId,
                processed: progress.processed,
                total: progress.total,
                currentCollection: progress.currentCollection,
                collections: progress.collections,
                overallProgress,
                rate: calculateRate(progress),
                timestamp: Date.now()
            })

            // 检查客户端连接状态
            if (event.node.req.destroyed) {
                clearInterval(progressInterval)
                cleanup()
                return
            }

        }, 1000) // 每秒更新一次

        // 超时保护
        setTimeout(() => {
            clearInterval(progressInterval)
            cleanup()
        }, 300000) // 5分钟超时

    } catch (err: any) {
        console.error('Export real progress error:', err)
        sendEvent('error', {
            message: err?.message || String(err),
            timestamp: Date.now()
        })
        cleanup()
    }
})

function calculateRate(progress: any): number {
    if (!progress.startTime || progress.processed === 0) return 0

    const elapsedSeconds = (Date.now() - progress.startTime) / 1000
    return Math.round((progress.processed / elapsedSeconds) * 100) / 100
}
