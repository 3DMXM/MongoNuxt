<template>
    <UModal v-model="isOpen">
        <UCard>
            <template #header>
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">导出数据库</h3>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-heroicons-x-mark-20-solid"
                        @click="close"
                    />
                </div>
            </template>

            <div class="space-y-6">
                <!-- 基本设置 -->
                <div>
                    <label class="block text-sm font-medium mb-2">数据库</label>
                    <UInput v-model="dbName" :disabled="true" />
                </div>

                <!-- 导出格式 -->
                <div>
                    <label class="block text-sm font-medium mb-2"
                        >导出格式</label
                    >
                    <USelectMenu
                        v-model="exportFormat"
                        :options="formatOptions"
                        value-attribute="value"
                        option-attribute="label"
                    />
                </div>

                <!-- 高级选项 -->
                <UAccordion :items="[{ label: '高级选项' }]">
                    <template #default="{ item, index, open }">
                        <div class="space-y-4 p-1">
                            <!-- 集合选择 -->
                            <div>
                                <label class="block text-sm font-medium mb-2"
                                    >选择集合（留空导出全部）</label
                                >
                                <USelectMenu
                                    v-model="selectedCollections"
                                    :options="collections"
                                    multiple
                                    placeholder="全部集合"
                                />
                            </div>

                            <!-- 批处理大小 -->
                            <div>
                                <label class="block text-sm font-medium mb-2"
                                    >批处理大小</label
                                >
                                <UInput
                                    v-model.number="batchSize"
                                    type="number"
                                    :min="100"
                                    :max="50000"
                                    placeholder="10000"
                                />
                                <p class="text-xs text-gray-500 mt-1">
                                    较大的批大小可以提高性能，但会增加内存使用
                                </p>
                            </div>

                            <!-- 压缩选项 -->
                            <div class="flex items-center space-x-2">
                                <UCheckbox v-model="enableCompression" />
                                <label class="text-sm">启用 Gzip 压缩</label>
                            </div>

                            <!-- CSV特定选项 -->
                            <div
                                v-if="exportFormat === 'csv'"
                                class="space-y-3"
                            >
                                <div>
                                    <label
                                        class="block text-sm font-medium mb-2"
                                        >CSV分隔符</label
                                    >
                                    <USelect
                                        v-model="csvDelimiter"
                                        :options="delimiterOptions"
                                    />
                                </div>

                                <div>
                                    <label
                                        class="block text-sm font-medium mb-2"
                                        >最大字段数</label
                                    >
                                    <UInput
                                        v-model.number="maxFields"
                                        type="number"
                                        :min="10"
                                        :max="500"
                                        placeholder="100"
                                    />
                                </div>

                                <div class="flex items-center space-x-2">
                                    <UCheckbox v-model="includeHeader" />
                                    <label class="text-sm">包含列标题</label>
                                </div>
                            </div>
                        </div>
                    </template>
                </UAccordion>

                <!-- 进度显示 -->
                <div v-if="isExporting" class="space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium">导出进度</span>
                        <span class="text-sm text-gray-500"
                            >{{ exportProgress.toFixed(1) }}%</span
                        >
                    </div>

                    <UProgress :value="exportProgress" />

                    <div class="text-xs text-gray-500 space-y-1">
                        <div v-if="currentCollection">
                            当前集合: {{ currentCollection }}
                        </div>
                        <div v-if="processedDocuments > 0">
                            已处理: {{ processedDocuments.toLocaleString() }} /
                            {{ totalDocuments.toLocaleString() }} 文档
                        </div>
                        <div v-if="exportRate > 0">
                            速度:
                            {{ Math.round(exportRate).toLocaleString() }}
                            文档/秒
                        </div>
                    </div>

                    <UButton
                        color="error"
                        variant="outline"
                        @click="cancelExport"
                        :loading="isCancelling"
                        class="w-full"
                    >
                        取消导出
                    </UButton>
                </div>

                <!-- 导出结果 -->
                <div v-if="exportResult" class="space-y-3">
                    <div
                        class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"
                    >
                        <div class="flex items-center space-x-2">
                            <UIcon
                                name="i-heroicons-check-circle"
                                class="w-5 h-5 text-green-600"
                            />
                            <span
                                class="text-sm font-medium text-green-800 dark:text-green-200"
                            >
                                导出完成
                            </span>
                        </div>
                        <p
                            class="text-xs text-green-700 dark:text-green-300 mt-1"
                        >
                            用时: {{ exportDuration }}秒，共处理
                            {{ totalProcessed.toLocaleString() }} 个文档
                        </p>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end space-x-3">
                    <UButton variant="ghost" @click="close">
                        {{ isExporting ? "后台运行" : "取消" }}
                    </UButton>
                    <UButton
                        @click="startExport"
                        :disabled="!dbName || isExporting"
                        :loading="isExporting"
                    >
                        {{ isExporting ? "导出中..." : "开始导出" }}
                    </UButton>
                </div>
            </template>
        </UCard>
    </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

interface ExportOptions {
    dbName: string;
    collections?: string[];
    format?: string;
    batchSize?: number;
    compress?: boolean;
    csvOptions?: {
        delimiter?: string;
        maxFields?: number;
        includeHeader?: boolean;
    };
}

const props = defineProps<{
    dbName: string;
    collections: string[];
}>();

const emit = defineEmits<{
    close: [];
}>();

// 响应式状态
const isOpen = ref(true);
const isExporting = ref(false);
const isCancelling = ref(false);
const exportProgress = ref(0);
const currentCollection = ref("");
const processedDocuments = ref(0);
const totalDocuments = ref(0);
const exportRate = ref(0);
const exportResult = ref<any>(null);
const exportDuration = ref(0);
const totalProcessed = ref(0);

// 导出配置
const dbName = ref(props.dbName);
const exportFormat = ref("json");
const selectedCollections = ref<string[]>([]);
const batchSize = ref(10000);
const enableCompression = ref(true);
const csvDelimiter = ref(",");
const maxFields = ref(100);
const includeHeader = ref(true);

// 选项配置
const formatOptions = [
    { label: "JSON (推荐)", value: "json" },
    { label: "CSV (单个集合)", value: "csv" },
];

const delimiterOptions = [
    { label: "逗号 (,)", value: "," },
    { label: "分号 (;)", value: ";" },
    { label: "制表符", value: "\t" },
    { label: "竖线 (|)", value: "|" },
];

// 当前导出ID
let currentExportId = "";
let eventSource: EventSource | null = null;

// 开始导出
async function startExport() {
    if (isExporting.value) return;

    try {
        isExporting.value = true;
        exportProgress.value = 0;
        exportResult.value = null;
        processedDocuments.value = 0;
        totalDocuments.value = 0;
        exportRate.value = 0;

        const startTime = Date.now();

        if (exportFormat.value === "csv") {
            await exportCsv();
        } else {
            await exportJson();
        }

        exportDuration.value = Math.round((Date.now() - startTime) / 1000);
    } catch (error: any) {
        console.error("Export error:", error);
        const toast = useToast();
        toast.add({
            title: "导出失败",
            description: error.message || "未知错误",
            color: "error",
        });
    } finally {
        isExporting.value = false;
        cleanup();
    }
}

// JSON格式导出
async function exportJson() {
    // 构建导出URL
    const params = new URLSearchParams({
        db: dbName.value,
        compress: enableCompression.value.toString(),
        batchSize: batchSize.value.toString(),
    });

    if (selectedCollections.value.length > 0) {
        params.append("collections", selectedCollections.value.join(","));
    }

    const url = `/api/mongo/database/export-enhanced?${params}`;

    // 获取导出ID并启动进度监控
    try {
        const response = await fetch(url, { method: "HEAD" });
        currentExportId = response.headers.get("X-Export-ID") || "";

        if (currentExportId) {
            startRealProgressMonitoring(currentExportId);
        }
    } catch (error) {
        console.warn("Failed to get export ID for progress tracking:", error);
    }

    // 创建下载
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dbName.value}-export-${Date.now()}.json${
        enableCompression.value ? ".gz" : ""
    }`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 如果没有进度监控，使用简单的完成逻辑
    if (!currentExportId) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        exportResult.value = {
            success: true,
            format: "json",
        };
    }
}

// CSV格式导出
async function exportCsv() {
    if (!selectedCollections.value.length) {
        throw new Error("CSV导出需要选择单个集合");
    }

    const collectionName = selectedCollections.value[0];
    if (!collectionName) {
        throw new Error("未选择有效的集合");
    }

    const params = new URLSearchParams();
    params.append("db", dbName.value);
    params.append("collection", collectionName);
    params.append("compress", enableCompression.value.toString());
    params.append("delimiter", csvDelimiter.value);
    params.append("maxFields", maxFields.value.toString());
    params.append("header", includeHeader.value.toString());

    const url = `/api/mongo/database/export-csv?${params}`;

    const link = document.createElement("a");
    link.href = url;
    link.download = `${dbName.value}-${collectionName}-${Date.now()}.csv${
        enableCompression.value ? ".gz" : ""
    }`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    exportResult.value = {
        success: true,
        format: "csv",
    };
}

// 启动真实进度监控
function startRealProgressMonitoring(exportId: string) {
    const url = `/api/mongo/database/export-real-progress?exportId=${encodeURIComponent(
        exportId
    )}`;
    eventSource = new EventSource(url);

    eventSource.addEventListener("start", (event) => {
        const data = JSON.parse(event.data);
        console.log("Export started:", data);
    });

    eventSource.addEventListener("progress", (event) => {
        const data = JSON.parse(event.data);
        processedDocuments.value = data.processed;
        totalDocuments.value = data.total;
        exportProgress.value = data.overallProgress || 0;
        exportRate.value = data.rate || 0;
        currentCollection.value = data.currentCollection || "";
    });

    eventSource.addEventListener("done", (event) => {
        const data = JSON.parse(event.data);
        exportProgress.value = 100;
        totalProcessed.value = processedDocuments.value;

        exportResult.value = {
            success: true,
            format: exportFormat.value,
        };

        cleanup();
    });

    eventSource.addEventListener("error", (event) => {
        console.error("Real progress monitoring error:", event);
        cleanup();
    });

    eventSource.onerror = () => {
        cleanup();
    };
}

// 启动进度监控（保留作为后备）
function startProgressMonitoring() {
    const url = `/api/mongo/database/export-progress?db=${encodeURIComponent(
        dbName.value
    )}`;
    eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleProgressUpdate(data);
        } catch (e) {
            console.warn("Failed to parse progress data:", e);
        }
    };

    eventSource.addEventListener("init", (event) => {
        const data = JSON.parse(event.data);
        totalDocuments.value = data.total;
    });

    eventSource.addEventListener("progress", (event) => {
        const data = JSON.parse(event.data);
        processedDocuments.value = data.processed;
        totalDocuments.value = data.total;
        exportProgress.value = data.overallProgress || 0;
        exportRate.value = data.rate || 0;
        currentCollection.value = data.collection || "";
    });

    eventSource.addEventListener("done", (event) => {
        const data = JSON.parse(event.data);
        exportProgress.value = 100;
        totalProcessed.value = data.processed;
        cleanup();
    });

    eventSource.addEventListener("error", (event) => {
        console.error("Progress monitoring error:", event);
        cleanup();
    });

    eventSource.onerror = () => {
        cleanup();
    };
}

// 处理进度更新
function handleProgressUpdate(data: any) {
    switch (data.type) {
        case "collectionStart":
            currentCollection.value = data.name;
            break;
        case "progress":
            processedDocuments.value = data.processed;
            totalDocuments.value = data.total;
            exportProgress.value = (data.processed / data.total) * 100;
            break;
    }
}

// 取消导出
async function cancelExport() {
    if (!currentExportId) return;

    try {
        isCancelling.value = true;

        await $fetch("/api/mongo/database/export-cancel", {
            method: "POST",
            body: { exportId: currentExportId },
        });

        const toast = useToast();
        toast.add({
            title: "导出已取消",
            color: "warning",
        });
    } catch (error: any) {
        console.error("Cancel error:", error);
    } finally {
        isCancelling.value = false;
        cleanup();
    }
}

// 清理资源
function cleanup() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    currentExportId = "";
}

// 关闭弹窗
function close() {
    cleanup();
    isOpen.value = false;
    emit("close");
}

// 组件卸载时清理
onUnmounted(() => {
    cleanup();
});
</script>
