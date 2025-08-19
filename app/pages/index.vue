<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        <!-- Left Sidebar -->
        <aside
            class="hidden lg:flex lg:flex-col w-72 bg-white dark:bg-gray-800"
        >
            <div class="p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h2
                            class="text-lg font-semibold text-gray-900 dark:text-white"
                        >
                            MongoDB 管理器
                        </h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            快速导航
                        </p>
                    </div>
                </div>
            </div>

            <div class="p-4 space-y-4 overflow-auto">
                <UCard>
                    <template #header>
                        <div class="flex items-center space-x-2">
                            <UIcon name="i-heroicons-link" class="w-4 h-4" />
                            <h3 class="text-sm font-medium">数据库连接</h3>
                            <UBadge
                                :color="store.connected ? 'success' : 'error'"
                                variant="soft"
                                size="sm"
                                class="ml-auto"
                            >
                                {{ store.connected ? "已连接" : "未连接" }}
                            </UBadge>
                        </div>
                    </template>
                    <ConnectionForm
                        @connect="onConnect"
                        :connected="store.connected"
                        :loading="connectionLoading"
                    />
                </UCard>

                <UCard v-if="store.connected">
                    <template #header>
                        <div class="flex items-center space-x-2">
                            <UIcon
                                name="i-heroicons-circle-stack"
                                class="w-4 h-4"
                            />
                            <h3 class="text-sm font-medium">数据库</h3>
                            <UBadge
                                color="info"
                                variant="soft"
                                size="sm"
                                class="ml-auto"
                                >{{ store.databases.length }}</UBadge
                            >
                        </div>
                    </template>
                    <DatabaseList
                        :databases="store.databases"
                        :activeDb="store.activeDb"
                        @select="selectDb"
                        @rename-db="openRenameDbDialog"
                        @delete-db="openDeleteDbDialog"
                    />
                </UCard>

                <UCard v-if="store.connected && store.activeDb">
                    <template #header>
                        <div class="flex items-center space-x-2">
                            <UIcon name="i-heroicons-folder" class="w-4 h-4" />
                            <h3 class="text-sm font-medium">集合</h3>
                            <UBadge
                                color="primary"
                                variant="soft"
                                size="sm"
                                class="ml-auto"
                                >{{ store.collections.length }}</UBadge
                            >
                        </div>
                    </template>
                    <CollectionList
                        :collections="store.collections"
                        :activeCollection="store.activeCollection"
                        @select="selectCollection"
                        @manage-indexes="openIndexManager"
                        @rename-collection="openRenameDialog"
                        @delete-collection="openDeleteCollectionDialog"
                    />
                </UCard>
            </div>
        </aside>

        <!-- Main Area -->
        <div class="flex-1 flex flex-col">
            <!-- Topbar -->
            <header
                class="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800"
            >
                <div class="flex items-center space-x-4">
                    <button
                        class="lg:hidden p-2 rounded-md bg-gray-100 dark:bg-gray-700"
                        @click="$emit('toggle-sidebar')"
                    >
                        <UIcon name="i-heroicons-bars-3" class="w-5 h-5" />
                    </button>
                    <div>
                        <h1
                            class="text-2xl font-semibold text-gray-900 dark:text-white"
                        >
                            MongoDB 管理器
                        </h1>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            连接和管理您的 MongoDB 数据库
                        </p>
                    </div>
                </div>

                <div class="flex items-center space-x-3">
                    <UButton @click="openGitHub" icon="i-heroicons-github"
                        >GitHub</UButton
                    >
                    <ColorModeButton />
                    <UButton
                        v-if="store.connected"
                        @click="disconnect"
                        color="error"
                        variant="outline"
                        icon="i-heroicons-x-mark"
                        >断开</UButton
                    >
                </div>
            </header>

            <!-- Content -->
            <main class="p-6 overflow-auto">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <!-- Overview Cards -->
                    <div
                        class="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                        <UCard>
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-500">数据库</p>
                                    <p class="text-xl font-semibold">
                                        {{ store.databases.length }}
                                    </p>
                                </div>
                                <UIcon
                                    name="i-heroicons-circle-stack"
                                    class="w-6 h-6 text-gray-400"
                                />
                            </div>
                        </UCard>
                        <UCard>
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-500">集合</p>
                                    <p class="text-xl font-semibold">
                                        {{ store.collections.length }}
                                    </p>
                                </div>
                                <UIcon
                                    name="i-heroicons-folder"
                                    class="w-6 h-6 text-gray-400"
                                />
                            </div>
                        </UCard>
                        <UCard>
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-500">
                                        文档(当前集合)
                                    </p>
                                    <p class="text-xl font-semibold">
                                        {{ store.docCount }}
                                    </p>
                                </div>
                                <UIcon
                                    name="i-heroicons-document-text"
                                    class="w-6 h-6 text-gray-400"
                                />
                            </div>
                        </UCard>
                    </div>

                    <!-- Document Preview (main) -->
                    <div
                        v-if="store.connected && store.activeCollection"
                        class="lg:col-span-8"
                    >
                        <UCard>
                            <template #header>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-2">
                                        <UIcon
                                            name="i-heroicons-document-text"
                                            class="w-5 h-5"
                                        />
                                        <h2 class="text-lg font-semibold">
                                            文档预览
                                        </h2>
                                        <UBadge
                                            color="warning"
                                            variant="soft"
                                            size="sm"
                                            >{{ store.docCount }} 条记录</UBadge
                                        >
                                    </div>
                                    <UButton
                                        @click="refreshDocuments"
                                        size="sm"
                                        variant="outline"
                                        icon="i-heroicons-arrow-path"
                                        :loading="loading"
                                        >刷新</UButton
                                    >
                                </div>
                            </template>
                            <DocumentPreview
                                :docs="store.docs"
                                @refresh="refreshDocuments"
                                @filter="onApplyFilter"
                                @pageChange="onPageChange"
                                @pageSizeChange="onPageSizeChange"
                            />
                        </UCard>
                    </div>

                    <!-- Right column: actions / manager -->
                    <div class="lg:col-span-4 space-y-6">
                        <UCard v-if="store.connected && store.activeDb">
                            <template #header>
                                <div class="flex items-center space-x-2">
                                    <UIcon
                                        name="i-heroicons-cog-6-tooth"
                                        class="w-4 h-4"
                                    />
                                    <h3 class="text-sm font-medium">
                                        数据库操作
                                    </h3>
                                </div>
                            </template>
                            <div class="flex flex-col space-y-2">
                                <UButton size="sm" @click="showCreateDb = true"
                                    >新建数据库</UButton
                                >
                                <UButton
                                    size="sm"
                                    :disabled="!store.activeDb"
                                    @click="openRenameDbDialog(store.activeDb)"
                                    >重命名数据库</UButton
                                >

                                <UButton
                                    size="sm"
                                    :disabled="!store.activeDb || exporting"
                                    :loading="exporting"
                                    @click="onExportDb(store.activeDb)"
                                >
                                    导出数据库
                                </UButton>

                                <div v-if="exporting" class="mt-2 space-y-2">
                                    <div
                                        class="flex items-center justify-between"
                                    >
                                        <span class="text-sm font-medium"
                                            >导出进度</span
                                        >
                                        <span class="text-sm text-gray-500"
                                            >{{ exportProgress }}%</span
                                        >
                                    </div>

                                    <div
                                        class="w-full bg-gray-200 h-2 rounded overflow-hidden"
                                    >
                                        <div
                                            class="bg-blue-500 h-2 transition-all"
                                            :style="{
                                                width: exportProgress + '%',
                                            }"
                                        ></div>
                                    </div>

                                    <div class="text-xs text-gray-500">
                                        <div v-if="exportCurrentCollection">
                                            当前集合:
                                            {{ exportCurrentCollection }}
                                        </div>
                                        <div v-if="processedDocuments > 0">
                                            已处理:
                                            {{
                                                processedDocuments.toLocaleString()
                                            }}
                                            /
                                            {{
                                                exportTotal.toLocaleString()
                                            }}
                                            文档
                                        </div>
                                        <div v-if="exportRate > 0">
                                            速度:
                                            {{
                                                Math.round(
                                                    exportRate
                                                ).toLocaleString()
                                            }}
                                            文档/秒
                                        </div>
                                    </div>
                                    <div>
                                        <UButton
                                            size="sm"
                                            color="error"
                                            @click="cancelExport"
                                            >取消导出</UButton
                                        >
                                    </div>
                                </div>
                                <UButton
                                    size="sm"
                                    :disabled="!store.activeDb || importing"
                                    :loading="importing"
                                    @click="onImportDb(store.activeDb)"
                                    >导入数据库</UButton
                                >
                                <UButton
                                    size="sm"
                                    :disabled="!store.activeDb || backingUp"
                                    :loading="backingUp"
                                    @click="onBackupDb(store.activeDb)"
                                    >备份数据库</UButton
                                >
                                <UButton
                                    size="sm"
                                    :disabled="!store.activeCollection"
                                    @click="
                                        store.activeCollection &&
                                            openIndexManager(
                                                store.activeCollection
                                            )
                                    "
                                    >索引管理</UButton
                                >
                                <UButton
                                    size="sm"
                                    color="error"
                                    :disabled="!store.activeDb"
                                    @click="openDeleteDbDialog(store.activeDb)"
                                    >删除数据库</UButton
                                >
                            </div>
                        </UCard>

                        <UCard v-if="!store.connected">
                            <div class="text-center py-8">
                                <UIcon
                                    name="i-heroicons-cloud-arrow-up"
                                    class="w-12 h-12 mx-auto text-gray-400 mb-3"
                                />
                                <p class="text-sm text-gray-500">
                                    请先连接数据库以查看详情
                                </p>
                            </div>
                        </UCard>
                    </div>
                </div>
            </main>
        </div>

        <!-- Mobile/Small screen: stack sidebar above content -->
        <div class="lg:hidden w-full">
            <!-- keep small connection area for mobile inside main flow if needed -->
        </div>

        <!-- IndexManager modal stays as component (controlled by showIndexManager) -->
        <IndexManager
            v-model:visible="showIndexManager"
            :db="store.activeDb || ''"
            :collection="indexManagerCollection || ''"
        />

        <!-- Dialogs (kept intact) -->
        <el-dialog v-model="showCreateColl" title="新建集合">
            <div>
                <el-input v-model="newCollectionName" placeholder="集合名" />
            </div>
            <template #footer>
                <div class="flex justify-end space-x-2">
                    <el-button @click="showCreateColl = false">取消</el-button>
                    <el-button type="primary" @click="createCollection"
                        >创建</el-button
                    >
                </div>
            </template>
        </el-dialog>

        <el-dialog v-model="showRenameColl" title="重命名集合">
            <div>
                <el-input v-model="renameTo" placeholder="新的集合名" />
            </div>
            <template #footer>
                <div class="flex justify-end space-x-2">
                    <el-button @click="showRenameColl = false">取消</el-button>
                    <el-button type="primary" @click="renameCollection"
                        >确定</el-button
                    >
                </div>
            </template>
        </el-dialog>

        <el-dialog v-model="showDeleteColl" title="删除集合">
            <div>
                确认要删除集合：<strong>{{ deleteTarget }}</strong> ?
                此操作不可恢复。
            </div>
            <template #footer>
                <div class="flex justify-end space-x-2">
                    <el-button @click="showDeleteColl = false">取消</el-button>
                    <el-button type="danger" @click="deleteCollectionConfirmed"
                        >删除</el-button
                    >
                </div>
            </template>
        </el-dialog>

        <el-dialog v-model="showCreateDb" title="新建数据库">
            <div>
                <el-input v-model="newDbName" placeholder="数据库名" />
            </div>
            <template #footer>
                <div class="flex justify-end space-x-2">
                    <el-button @click="showCreateDb = false">取消</el-button>
                    <el-button type="primary" @click="createDatabaseConfirmed"
                        >创建</el-button
                    >
                </div>
            </template>
        </el-dialog>

        <el-dialog v-model="showRenameDb" title="重命名数据库">
            <div>
                <el-input v-model="renameDbTo" placeholder="新的数据库名" />
            </div>
            <template #footer>
                <div class="flex justify-end space-x-2">
                    <el-button @click="showRenameDb = false">取消</el-button>
                    <el-button type="primary" @click="renameDatabaseConfirmed"
                        >确定</el-button
                    >
                </div>
            </template>
        </el-dialog>

        <el-dialog v-model="showDeleteDb" title="删除数据库">
            <div>
                确认要删除数据库：<strong>{{ deleteDbTarget }}</strong> ?
                此操作不可恢复。
            </div>
            <template #footer>
                <div class="flex justify-end space-x-2">
                    <el-button @click="showDeleteDb = false">取消</el-button>
                    <el-button type="danger" @click="deleteDatabaseConfirmed"
                        >删除</el-button
                    >
                </div>
            </template>
        </el-dialog>
    </div>

    <!-- hidden file input for import -->
    <input
        ref="importFileInput"
        type="file"
        accept="application/json,application/gzip,.gz,.gzip"
        style="display: none"
        @change="handleImportFile"
    />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useMongoStore } from "../../stores/mongo";
import { ElMessage, ElMessageBox } from "element-plus";
import IndexManager from "../components/IndexManager.vue";

const store = useMongoStore();
const loading = ref(false);
const connectionLoading = ref(false);
const currentFilter = ref<any>(null);
const showIndexManager = ref(false);
const indexManagerCollection = ref<string | null>(null);
const showCreateColl = ref(false);
const newCollectionName = ref("");
const showCreateDb = ref(false);
const newDbName = ref("");
const showRenameDb = ref(false);
const renameDbFrom = ref<string | null>(null);
const renameDbTo = ref("");
const showDeleteDb = ref(false);
const deleteDbTarget = ref<string | null>(null);
const showRenameColl = ref(false);
const renameFrom = ref<string | null>(null);
const renameTo = ref("");
const showDeleteColl = ref(false);
const deleteTarget = ref<string | null>(null);
// file input ref for import
const importFileInput = ref<HTMLInputElement | null>(null);
const importProgress = ref(0);
const showImportConfirm = ref(false);
// status flags for DB operations
const exporting = ref(false);
const importing = ref(false);
const backingUp = ref(false);
const exportProgress = ref(0);
// enhanced export tracking
const processedDocuments = ref(0);
const exportTotal = ref(0);
const exportRate = ref(0);
const exportCurrentCollection = ref("");
let currentExportId = "";
let exportEventSource: EventSource | null = null;

// pagination handlers
async function onPageChange(page: number) {
    if (!store.activeDb || !store.activeCollection) return;
    loading.value = true;
    try {
        await store.find(
            store.activeDb,
            store.activeCollection,
            currentFilter.value || {},
            page,
            store.pageSize
        );
    } catch (error: any) {
        ElMessage.error(error.message || "无法切换页码");
    } finally {
        loading.value = false;
    }
}

async function onPageSizeChange(size: number) {
    if (!store.activeDb || !store.activeCollection) return;
    loading.value = true;
    try {
        // reset to page 1 when page size changes
        await store.find(
            store.activeDb,
            store.activeCollection,
            currentFilter.value || {},
            1,
            size
        );
    } catch (error: any) {
        ElMessage.error(error.message || "无法更改每页数量");
    } finally {
        loading.value = false;
    }
}

async function onConnect(uri: string) {
    if (!uri.trim()) {
        ElMessage.warning("请输入有效的 MongoDB 连接字符串");
        return;
    }

    connectionLoading.value = true;
    try {
        const result = await store.connect(uri);
        if (store.connected) {
            await store.listDatabases();
            ElMessage.success("已成功连接到 MongoDB");
        } else {
            ElMessage.error(result.error || "无法连接到数据库");
        }
    } catch (error: any) {
        ElMessage.error(error.message || "连接时发生未知错误");
    } finally {
        connectionLoading.value = false;
    }
}

async function selectDb(db: string) {
    try {
        await store.listCollections(db);
        ElMessage.info(`已切换到数据库：${db}`);
    } catch (error: any) {
        ElMessage.error(error.message || "无法获取集合列表");
    }
}

async function selectCollection(collection: string) {
    if (!store.activeDb) return;

    loading.value = true;
    try {
        currentFilter.value = null;
        await store.find(store.activeDb, collection, {}, 1, store.pageSize);
        ElMessage.info(`已加载 ${store.docs.length} 个文档`);
    } catch (error: any) {
        ElMessage.error(error.message || "无法获取文档列表");
    } finally {
        loading.value = false;
    }
}

function openIndexManager(collection: string) {
    indexManagerCollection.value = collection;
    showIndexManager.value = true;
}

async function createCollection() {
    if (!store.activeDb) {
        ElMessage.warning("请先选择数据库");
        return;
    }
    if (!newCollectionName.value.trim()) {
        ElMessage.warning("请输入集合名");
        return;
    }
    try {
        await store.createCollection(
            store.activeDb,
            newCollectionName.value.trim()
        );
        ElMessage.success("集合已创建");
        showCreateColl.value = false;
        newCollectionName.value = "";
    } catch (err: any) {
        ElMessage.error("创建失败: " + (err.message || String(err)));
    }
}

function openRenameDialog(collection: string) {
    renameFrom.value = collection;
    renameTo.value = collection;
    showRenameColl.value = true;
}

async function renameCollection() {
    if (!store.activeDb || !renameFrom.value) return;
    if (!renameTo.value.trim()) {
        ElMessage.warning("请输入新的集合名");
        return;
    }
    try {
        await store.renameCollection(
            store.activeDb,
            renameFrom.value,
            renameTo.value.trim()
        );
        ElMessage.success("集合已重命名");
        showRenameColl.value = false;
        renameFrom.value = null;
        renameTo.value = "";
    } catch (err: any) {
        const msg = err?.statusMessage || err?.message || String(err);
        if (msg && msg.toLowerCase().includes("target namespace exists")) {
            try {
                await ElMessageBox.confirm(
                    "目标集合已存在，是否覆盖并重命名？",
                    "覆盖确认",
                    { type: "warning" }
                );
                // retry with dropTarget = true
                await store.renameCollection(
                    store.activeDb,
                    renameFrom.value!,
                    renameTo.value.trim(),
                    true
                );
                ElMessage.success("集合已重命名（覆盖）");
                showRenameColl.value = false;
                renameFrom.value = null;
                renameTo.value = "";
            } catch (e) {
                // user cancelled or retry failed
                ElMessage.info("已取消重命名");
            }
        } else {
            ElMessage.error("重命名失败: " + msg);
        }
    }
}

function openDeleteCollectionDialog(collection: string) {
    deleteTarget.value = collection;
    showDeleteColl.value = true;
}

function openRenameDbDialog(db: string | null) {
    if (!db) return;
    renameDbFrom.value = db;
    renameDbTo.value = db;
    showRenameDb.value = true;
}

function openDeleteDbDialog(db: string | null) {
    if (!db) return;
    deleteDbTarget.value = db;
    showDeleteDb.value = true;
}

async function createDatabaseConfirmed() {
    if (!newDbName.value.trim()) {
        ElMessage.warning("请输入数据库名");
        return;
    }
    try {
        await store.createDatabase(newDbName.value.trim());
        ElMessage.success("数据库已创建");
        showCreateDb.value = false;
        newDbName.value = "";
    } catch (err: any) {
        ElMessage.error("创建失败: " + (err.message || String(err)));
    }
}

async function deleteDatabaseConfirmed() {
    if (!deleteDbTarget.value) return;
    try {
        await store.deleteDatabase(deleteDbTarget.value);
        ElMessage.success("数据库已删除");
        showDeleteDb.value = false;
        deleteDbTarget.value = null;
    } catch (err: any) {
        ElMessage.error("删除失败: " + (err.message || String(err)));
    }
}

async function renameDatabaseConfirmed() {
    if (!renameDbFrom.value) return;
    if (!renameDbTo.value.trim()) {
        ElMessage.warning("请输入目标数据库名");
        return;
    }
    try {
        await store.renameDatabase(renameDbFrom.value, renameDbTo.value.trim());
        ElMessage.success("数据库已重命名");
        showRenameDb.value = false;
        renameDbFrom.value = null;
        renameDbTo.value = "";
    } catch (err: any) {
        ElMessage.error("重命名失败: " + (err.message || String(err)));
    }
}

async function deleteCollectionConfirmed() {
    if (!store.activeDb || !deleteTarget.value) return;
    try {
        await store.deleteCollection(store.activeDb, deleteTarget.value);
        ElMessage.success("集合已删除");
        showDeleteColl.value = false;
        deleteTarget.value = null;
    } catch (err: any) {
        ElMessage.error("删除失败: " + (err.message || String(err)));
    }
}

async function refreshDocuments() {
    if (!store.activeDb || !store.activeCollection) return;

    loading.value = true;
    try {
        await store.find(
            store.activeDb,
            store.activeCollection,
            currentFilter.value || {},
            1,
            store.pageSize
        );
        ElMessage.success(`已重新加载 ${store.docs.length} 个文档`);
    } catch (error: any) {
        ElMessage.error(error.message || "无法刷新文档");
    } finally {
        loading.value = false;
    }
}

async function onApplyFilter(filter: any | null) {
    if (!store.activeDb || !store.activeCollection) {
        ElMessage.warning("请先选择数据库和集合");
        return;
    }

    currentFilter.value = filter;
    loading.value = true;
    try {
        await store.find(
            store.activeDb,
            store.activeCollection,
            filter || {},
            1,
            store.pageSize
        );
        ElMessage.success(`筛选后 ${store.docs.length} 个文档`);
    } catch (error: any) {
        ElMessage.error(error.message || "筛选失败");
    } finally {
        loading.value = false;
    }
}

function disconnect() {
    store.disconnect();
    ElMessage.info("与数据库的连接已断开");
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function openGitHub() {
    window.open("https://github.com/3DMXM/MongoNuxt", "_blank");
}

// Database export/import/backup handlers
async function onExportDb(db: string) {
    exporting.value = true;
    exportProgress.value = 0;
    processedDocuments.value = 0;
    exportTotal.value = 0;
    exportRate.value = 0;
    exportCurrentCollection.value = "";

    try {
        // initiate HEAD to get export ID for tracking
        const params = new URLSearchParams({ db });
        const exportUrl = `/api/mongo/database/export-enhanced?${params}`;
        let exportId = "";

        try {
            const headResp = await fetch(exportUrl, { method: "HEAD" });
            exportId = headResp.headers.get("X-Export-ID") || "";
        } catch (e) {
            console.warn("Failed to obtain export id via HEAD:", e);
        }

        // if we got an exportId, open real progress SSE
        if (exportId) {
            currentExportId = exportId;
            const sseUrl = `/api/mongo/database/export-real-progress?exportId=${encodeURIComponent(
                exportId
            )}`;
            exportEventSource = new EventSource(sseUrl);

            exportEventSource.addEventListener(
                "progress",
                (e: MessageEvent) => {
                    try {
                        const data = JSON.parse(e.data);
                        processedDocuments.value =
                            data.processed || processedDocuments.value;
                        exportTotal.value = data.total || exportTotal.value;
                        exportProgress.value =
                            data.overallProgress || exportProgress.value;
                        exportRate.value = data.rate || exportRate.value;
                        exportCurrentCollection.value =
                            data.currentCollection ||
                            exportCurrentCollection.value;
                    } catch (err) {
                        console.warn("Invalid progress data", err);
                    }
                }
            );

            exportEventSource.addEventListener(
                "done",
                async (e: MessageEvent) => {
                    try {
                        const data = JSON.parse(e.data);
                        processedDocuments.value =
                            data.processed || processedDocuments.value;
                        exportTotal.value = data.total || exportTotal.value;
                        exportProgress.value = 100;
                    } catch (err) {}

                    // download the exported file via store API fallback
                    try {
                        const res = await store.exportDatabase(db);
                        const blob = res.blob;
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        let fname = `${db}-export.json`;
                        try {
                            const cd = res.filename;
                            if (cd && typeof cd === "string") {
                                const m = cd.match(/filename="?(.*)"?/) || [];
                                if (m[1]) fname = m[1];
                            }
                        } catch (e) {}
                        a.download = fname;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        ElMessage.success("导出已完成并下载");
                    } catch (err) {
                        console.warn("Download fallback failed", err);
                    } finally {
                        if (exportEventSource) {
                            exportEventSource.close();
                            exportEventSource = null;
                        }
                        currentExportId = "";
                        exporting.value = false;
                    }
                }
            );

            exportEventSource.addEventListener("error", (e: any) => {
                console.warn("Export SSE error", e);
                if (exportEventSource) {
                    exportEventSource.close();
                    exportEventSource = null;
                }
                currentExportId = "";
                exporting.value = false;
            });

            // trigger download by navigating to export URL
            const a = document.createElement("a");
            a.href = exportUrl;
            a.download = `${db}-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            // wait until SSE 'done' or timeout
            // timeout handled by backend SSE endpoint
        } else {
            // fallback: direct export
            const res = await store.exportDatabase(db);
            const blob = res.blob;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            let fname = `${db}-export.json`;
            try {
                const cd = res.filename;
                if (cd && typeof cd === "string") {
                    const m = cd.match(/filename="?(.*)"?/) || [];
                    if (m[1]) fname = m[1];
                }
            } catch (e) {}
            a.download = fname;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            ElMessage.success("导出已开始（回退）");
            exporting.value = false;
        }
    } catch (err: any) {
        ElMessage.error(err.message || "导出失败");
        exporting.value = false;
    }
}

function onImportDb(db: string) {
    // set dataset-attr to know target db
    if (!importFileInput.value) return;
    importFileInput.value.dataset.db = db;
    importFileInput.value.click();
}

async function handleImportFile(e: Event) {
    const inp = e.target as HTMLInputElement;
    const files = inp.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const db = inp.dataset.db;
    if (!db) return ElMessage.error("未知目标数据库");
    try {
        if (!file) throw new Error("请选择文件");

        // ask for confirmation because import will drop existing collections
        await ElMessageBox.confirm(
            `即将导入 ${file.name} 到数据库 ${db}，导入过程会替换已存在的集合，是否继续？`,
            "导入确认",
            { type: "warning" }
        );

        importing.value = true;
        importProgress.value = 0;

        await store.importDatabase(db, file, (loaded, total) => {
            if (total > 0)
                importProgress.value = Math.round((loaded / total) * 100);
        });

        ElMessage.success("导入完成");
        await store.listDatabases();
    } catch (err: any) {
        if (err && err.message && err.message.includes("取消")) {
            ElMessage.info("已取消导入");
        } else {
            ElMessage.error(err.message || "导入失败");
        }
    } finally {
        importing.value = false;
        // clear input
        inp.value = "" as any;
        delete inp.dataset.db;
        importProgress.value = 0;
    }
}

async function onBackupDb(db: string) {
    backingUp.value = true;
    try {
        const res = await store.backupDatabase(db);
        if (res && res.filename) {
            // auto-download backup
            const d = await store.downloadBackup(res.filename);
            const url = URL.createObjectURL(d.blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = res.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            ElMessage.success("备份并下载完成");
        } else {
            ElMessage.success("备份已创建");
        }
    } catch (err: any) {
        ElMessage.error(err.message || "备份失败");
    } finally {
        backingUp.value = false;
    }
}

// cancel export (call server endpoint)
async function cancelExport() {
    if (!currentExportId) return;
    try {
        await $fetch("/api/mongo/database/export-cancel", {
            method: "POST",
            body: { exportId: currentExportId },
        });
        ElMessage.info("已请求取消导出");
    } catch (e) {
        console.warn("Cancel export failed", e);
    } finally {
        if (exportEventSource) {
            exportEventSource.close();
            exportEventSource = null;
        }
        currentExportId = "";
        exporting.value = false;
    }
}

// cleanup on unmount
onBeforeUnmount(() => {
    if (exportEventSource) {
        try {
            exportEventSource.close();
        } catch (e) {}
        exportEventSource = null;
    }
});

// SEO Meta
useHead({
    title: "MongoDB 管理器",
    meta: [
        { name: "description", content: "一个现代化的 MongoDB 数据库管理工具" },
    ],
});
</script>
