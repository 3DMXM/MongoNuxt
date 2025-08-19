<template>
    <div>
        <!-- Action Bar -->
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-3">
                <el-button
                    @click="openCreateModal"
                    type="primary"
                    :icon="Plus"
                    size="default"
                >
                    新建文档
                </el-button>
                <el-button
                    @click="$emit('refresh')"
                    :icon="Refresh"
                    :loading="refreshing"
                >
                    刷新
                </el-button>
            </div>

            <!-- Filter input -->
            <div class="flex items-center space-x-2">
                <el-input
                    v-model="filterText"
                    placeholder='输入 JSON 查询，例如: {"name":"Alice"}'
                    size="small"
                    clearable
                    class="w-64"
                />
                <el-button @click="applyFilter" size="small">筛选</el-button>
                <el-button
                    @click="clearFilter"
                    size="small"
                    :disabled="!hasFilter"
                    >清除</el-button
                >
            </div>

            <div class="text-sm text-gray-500 dark:text-gray-400">
                共 {{ store.docCount }} 个文档
            </div>
        </div>

        <div v-if="docs.length === 0" class="text-center py-8">
            <el-icon size="48" class="text-gray-400 mb-4">
                <DocumentCopy />
            </el-icon>
            <p class="text-gray-500 dark:text-gray-400">暂无文档数据</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">
                选择一个集合来查看文档，或点击上方按钮创建新文档
            </p>
        </div>

        <div v-else class="space-y-4">
            <el-card
                v-for="(doc, index) in docs"
                :key="doc._id || index"
                class="overflow-hidden fade-in"
                shadow="hover"
            >
                <template #header>
                    <div class="flex items-center justify-between">
                        <span
                            class="text-sm font-medium text-gray-600 dark:text-gray-400"
                        >
                            文档 #{{ index + 1 }}
                        </span>
                        <div class="flex items-center space-x-2">
                            <el-tag v-if="doc._id" size="small" type="info">
                                ID: {{ getShortId(doc._id) }}
                            </el-tag>
                            <el-tooltip content="编辑文档" placement="top">
                                <el-button
                                    @click="openEditModal(doc)"
                                    size="small"
                                    :icon="Edit"
                                    circle
                                />
                            </el-tooltip>
                            <el-tooltip content="删除文档" placement="top">
                                <el-button
                                    @click="openDeleteModal(doc)"
                                    size="small"
                                    type="danger"
                                    :icon="Delete"
                                    circle
                                />
                            </el-tooltip>
                            <el-tooltip content="复制到剪贴板" placement="top">
                                <el-button
                                    @click="copyToClipboard(doc)"
                                    size="small"
                                    :icon="DocumentCopy"
                                    circle
                                />
                            </el-tooltip>
                            <el-tooltip content="展开/收起" placement="top">
                                <el-button
                                    @click="toggleExpanded(index)"
                                    size="small"
                                    :icon="
                                        expandedItems.has(index)
                                            ? ArrowUp
                                            : ArrowDown
                                    "
                                    circle
                                />
                            </el-tooltip>
                        </div>
                    </div>
                </template>

                <div class="relative">
                    <el-scrollbar
                        :max-height="
                            expandedItems.has(index) ? 'none' : '250px'
                        "
                    >
                        <pre
                            class="text-xs bg-gray-50 dark:bg-gray-800 p-4 rounded-lg font-mono"
                            >{{ formatJson(doc) }}</pre
                        >
                    </el-scrollbar>
                </div>
            </el-card>

            <!-- Pagination -->
            <div class="text-center pt-4">
                <el-pagination
                    v-if="store.docCount > 0"
                    :current-page="store.currentPage"
                    :page-size="store.pageSize"
                    :total="store.docCount"
                    layout="prev, pager, next, sizes, total"
                    @current-change="(p) => emit('pageChange', p)"
                    @size-change="(s) => emit('pageSizeChange', s)"
                />
            </div>
        </div>

        <!-- Document Editor Modal -->
        <DocumentEditor
            v-model="showEditor"
            :document="selectedDocument"
            :is-edit="isEditMode"
            @save="handleSaveDocument"
        />

        <!-- Delete Confirmation Modal -->
        <DeleteConfirm
            v-model="showDeleteConfirm"
            :document="selectedDocument"
            @delete="handleDeleteDocument"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useMongoStore } from "../../stores/mongo";
import { ElMessage } from "element-plus";
import {
    Plus,
    Refresh,
    Edit,
    Delete,
    DocumentCopy,
    ArrowDown,
    ArrowUp,
} from "@element-plus/icons-vue";
import DocumentEditor from "./DocumentEditor.vue";
import DeleteConfirm from "./DeleteConfirm.vue";

const props = defineProps<{ docs: Array<any> }>();
const emit = defineEmits<{
    loadMore: [];
    refresh: [];
    filter: [filter: any | null];
    pageChange: [page: number];
    pageSizeChange: [size: number];
}>();

const store = useMongoStore();
const expandedItems = reactive(new Set<number>());

// Modal states
const showEditor = ref(false);
const showDeleteConfirm = ref(false);
const selectedDocument = ref<any>(null);
const isEditMode = ref(false);
const refreshing = ref(false);

// Filter state
const filterText = ref("");

const hasFilter = computed(() => filterText.value.trim().length > 0);

function applyFilter() {
    if (!filterText.value.trim()) {
        emit("filter", null);
        return;
    }

    try {
        const parsed = JSON.parse(filterText.value);
        emit("filter", parsed);
    } catch (err: any) {
        ElMessage.error("无效的 JSON 查询");
    }
}

function clearFilter() {
    filterText.value = "";
    emit("filter", null);
}

function formatJson(obj: any) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

function getShortId(id: any): string {
    const idStr = id.toString();
    return idStr.length > 8 ? idStr.slice(-8) : idStr;
}

function toggleExpanded(index: number) {
    if (expandedItems.has(index)) {
        expandedItems.delete(index);
    } else {
        expandedItems.add(index);
    }
}

async function copyToClipboard(doc: any) {
    try {
        await navigator.clipboard.writeText(formatJson(doc));
        ElMessage.success("文档已复制到剪贴板");
    } catch (error) {
        ElMessage.error("无法访问剪贴板");
    }
}

// CRUD Operations
function openCreateModal() {
    selectedDocument.value = null;
    isEditMode.value = false;
    showEditor.value = true;
}

function openEditModal(doc: any) {
    selectedDocument.value = doc;
    isEditMode.value = true;
    showEditor.value = true;
}

function openDeleteModal(doc: any) {
    selectedDocument.value = doc;
    showDeleteConfirm.value = true;
}

async function handleSaveDocument(document: any) {
    if (!store.activeDb || !store.activeCollection) {
        ElMessage.error("请先选择数据库和集合");
        return;
    }

    try {
        if (isEditMode.value) {
            // Update existing document
            if (!selectedDocument.value._id) {
                throw new Error("文档缺少 _id 字段");
            }

            const filter = { _id: selectedDocument.value._id };
            // Remove _id from the document to avoid immutable field error
            const { _id, ...documentWithoutId } = document;
            const update = { $set: documentWithoutId };

            await store.updateDocument(
                store.activeDb,
                store.activeCollection,
                filter,
                update
            );
            ElMessage.success("文档已成功更新");
        } else {
            // Create new document
            await store.createDocument(
                store.activeDb,
                store.activeCollection,
                document
            );
            ElMessage.success("文档已成功创建");
        }

        // Refresh documents
        await store.refreshDocuments();
        showEditor.value = false;
    } catch (error: any) {
        ElMessage.error(
            isEditMode.value
                ? "更新失败: " + error.message
                : "创建失败: " + error.message
        );
    }
}

async function handleDeleteDocument() {
    if (!store.activeDb || !store.activeCollection || !selectedDocument.value) {
        ElMessage.error("缺少必要信息");
        return;
    }

    try {
        const filter = { _id: selectedDocument.value._id };
        await store.deleteDocument(
            store.activeDb,
            store.activeCollection,
            filter
        );

        ElMessage.success("文档已成功删除");

        // Refresh documents
        await store.refreshDocuments();
        showDeleteConfirm.value = false;
    } catch (error: any) {
        ElMessage.error("删除失败: " + (error.message || "删除操作失败"));
    }
}
</script>
