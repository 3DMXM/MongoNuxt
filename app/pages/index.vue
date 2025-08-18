<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
        <!-- Header -->
        <UContainer class="py-6">
            <div class="flex items-center justify-between">
                <div>
                    <h1
                        class="text-3xl font-bold text-gray-900 dark:text-white"
                    >
                        MongoDB 管理器
                    </h1>
                    <p class="text-gray-600 dark:text-gray-400 mt-2">
                        连接和管理您的 MongoDB 数据库
                    </p>
                </div>
                <div class="flex items-center space-x-4">
                    <ColorModeButton />
                    <UButton
                        v-if="store.connected"
                        @click="disconnect"
                        color="error"
                        variant="outline"
                        icon="i-heroicons-x-mark"
                    >
                        断开连接
                    </UButton>
                </div>
            </div>
        </UContainer>

        <!-- Main Content -->
        <UContainer class="pb-12">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Connection Panel -->
                <div class="lg:col-span-12">
                    <UCard>
                        <template #header>
                            <div class="flex items-center space-x-2">
                                <UIcon
                                    name="i-heroicons-link"
                                    class="w-5 h-5"
                                />
                                <h2 class="text-lg font-semibold">
                                    数据库连接
                                </h2>
                                <UBadge
                                    :color="
                                        store.connected ? 'success' : 'error'
                                    "
                                    variant="soft"
                                    size="sm"
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
                </div>

                <!-- Database and Collection Lists -->
                <div v-if="store.connected" class="lg:col-span-4 space-y-6">
                    <!-- Database List -->
                    <UCard>
                        <template #header>
                            <div class="flex items-center space-x-2">
                                <UIcon
                                    name="i-heroicons-circle-stack"
                                    class="w-5 h-5"
                                />
                                <h2 class="text-lg font-semibold">
                                    数据库列表
                                </h2>
                                <UBadge color="info" variant="soft" size="sm">
                                    {{ store.databases.length }}
                                </UBadge>
                            </div>
                        </template>

                        <DatabaseList
                            :databases="store.databases"
                            :activeDb="store.activeDb"
                            @select="selectDb"
                        />
                    </UCard>

                    <!-- Collection List -->
                    <UCard v-if="store.activeDb">
                        <template #header>
                            <div class="flex items-center space-x-2">
                                <UIcon
                                    name="i-heroicons-folder"
                                    class="w-5 h-5"
                                />
                                <h2 class="text-lg font-semibold">集合列表</h2>
                                <UBadge
                                    color="primary"
                                    variant="soft"
                                    size="sm"
                                >
                                    {{ store.collections.length }}
                                </UBadge>
                            </div>
                        </template>

                        <CollectionList
                            :collections="store.collections"
                            :activeCollection="store.activeCollection"
                            @select="selectCollection"
                        />
                    </UCard>
                </div>

                <!-- Document Preview -->
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
                                    >
                                        {{ store.docs.length }} 条记录
                                    </UBadge>
                                </div>
                                <UButton
                                    @click="refreshDocuments"
                                    size="sm"
                                    variant="outline"
                                    icon="i-heroicons-arrow-path"
                                    :loading="loading"
                                >
                                    刷新
                                </UButton>
                            </div>
                        </template>

                        <DocumentPreview
                            :docs="store.docs"
                            @refresh="refreshDocuments"
                        />
                    </UCard>
                </div>

                <!-- Welcome Message -->
                <div v-if="!store.connected" class="lg:col-span-12">
                    <UCard>
                        <div class="text-center py-12">
                            <UIcon
                                name="i-heroicons-cloud-arrow-up"
                                class="w-16 h-16 mx-auto text-gray-400 mb-4"
                            />
                            <h3
                                class="text-xl font-semibold text-gray-900 dark:text-white mb-2"
                            >
                                欢迎使用 MongoDB 管理器
                            </h3>
                            <p class="text-gray-600 dark:text-gray-400 mb-6">
                                请在上方输入您的 MongoDB 连接字符串开始使用
                            </p>
                            <UButton
                                @click="scrollToTop"
                                variant="soft"
                                icon="i-heroicons-arrow-up"
                            >
                                开始连接
                            </UButton>
                        </div>
                    </UCard>
                </div>
            </div>
        </UContainer>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useMongoStore } from "../../stores/mongo";
import { ElMessage } from "element-plus";

const store = useMongoStore();
const loading = ref(false);
const connectionLoading = ref(false);

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
        await store.find(store.activeDb, collection, {}, 20);
        ElMessage.info(`已加载 ${store.docs.length} 个文档`);
    } catch (error: any) {
        ElMessage.error(error.message || "无法获取文档列表");
    } finally {
        loading.value = false;
    }
}

async function refreshDocuments() {
    if (!store.activeDb || !store.activeCollection) return;

    loading.value = true;
    try {
        await store.find(store.activeDb, store.activeCollection, {}, 20);
        ElMessage.success(`已重新加载 ${store.docs.length} 个文档`);
    } catch (error: any) {
        ElMessage.error(error.message || "无法刷新文档");
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

// SEO Meta
useHead({
    title: "MongoDB 管理器",
    meta: [
        { name: "description", content: "一个现代化的 MongoDB 数据库管理工具" },
    ],
});
</script>
