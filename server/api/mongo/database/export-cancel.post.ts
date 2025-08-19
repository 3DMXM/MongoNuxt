import { createError } from 'h3'

// 存储活跃的导出操作和进度信息
const activeExports = new Map<string, {
    cancelled: boolean;
    timestamp: number;
    progress?: {
        processed: number;
        total: number;
        currentCollection: string;
        collections: string[];
        startTime: number;
    }
}>()

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { exportId } = body

    if (!exportId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing exportId parameter'
        })
    }

    try {
        // 标记导出为已取消
        if (activeExports.has(exportId)) {
            const exportData = activeExports.get(exportId)!
            activeExports.set(exportId, {
                ...exportData,
                cancelled: true,
                timestamp: Date.now()
            })

            return {
                success: true,
                message: 'Export cancellation requested',
                exportId
            }
        } else {
            return {
                success: false,
                message: 'Export not found or already completed',
                exportId
            }
        }
    } catch (err: any) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to cancel export: ${err?.message || String(err)}`
        })
    }
})

// 工具函数：注册导出操作
export function registerExport(exportId: string) {
    activeExports.set(exportId, {
        cancelled: false,
        timestamp: Date.now(),
        progress: {
            processed: 0,
            total: 0,
            currentCollection: '',
            collections: [],
            startTime: Date.now()
        }
    })

    // 清理超过1小时的旧记录
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    for (const [id, data] of activeExports.entries()) {
        if (data.timestamp < oneHourAgo) {
            activeExports.delete(id)
        }
    }
}

// 工具函数：检查导出是否被取消
export function isExportCancelled(exportId: string): boolean {
    const exportData = activeExports.get(exportId)
    return exportData?.cancelled === true
}

// 工具函数：更新导出进度
export function updateExportProgress(exportId: string, progress: {
    processed: number;
    total: number;
    currentCollection: string;
    collections?: string[];
}) {
    const exportData = activeExports.get(exportId)
    if (exportData) {
        activeExports.set(exportId, {
            ...exportData,
            progress: {
                ...exportData.progress!,
                ...progress
            }
        })
    }
}

// 工具函数：获取导出进度
export function getExportProgress(exportId: string) {
    const exportData = activeExports.get(exportId)
    return exportData?.progress || null
}

// 工具函数：完成导出操作
export function completeExport(exportId: string) {
    activeExports.delete(exportId)
}
