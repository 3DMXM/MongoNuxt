<template>
    <div class="space-y-4">
        <div class="space-y-4">
            <div class="space-y-2">
                <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    MongoDB 连接字符串
                </label>
                <UInput
                    v-model="uri"
                    :placeholder="placeholder || 'mongodb://localhost:27017'"
                    icon="i-heroicons-link"
                    size="lg"
                    :disabled="connected"
                    class="w-full"
                />

                <!-- Connection history (from cookie) -->
                <div v-if="history.length && !connected" class="mt-2">
                    <div class="flex items-center justify-between mb-2">
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                            最近连接
                        </div>
                        <UButton size="xs" variant="link" @click="clearHistory"
                            >清除历史</UButton
                        >
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <UButton
                            v-for="(h, idx) in history"
                            :key="idx"
                            size="sm"
                            variant="outline"
                            class="justify-start max-w-full truncate"
                            @click="setQuickConnect(h)"
                        >
                            {{ h }}
                        </UButton>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between">
                <div
                    class="flex items-center space-x-3"
                    style="flex-direction: column"
                >
                    <UButton
                        @click="connectNow"
                        :loading="isLoading"
                        :disabled="!uri.trim() || connected"
                        size="lg"
                        icon="i-heroicons-play"
                        class="m-2"
                    >
                        {{ connected ? "已连接" : "连接数据库" }}
                    </UButton>

                    <UButton
                        v-if="uri && !connected"
                        @click="clearUri"
                        variant="outline"
                        size="lg"
                        icon="i-heroicons-x-mark"
                    >
                        清空
                    </UButton>
                </div>

                <div class="flex items-center space-x-2">
                    <!-- Connection Status -->
                    <div class="flex items-center space-x-2">
                        <div
                            :class="[
                                'w-2 h-2 rounded-full',
                                connected ? 'bg-green-500' : 'bg-gray-400',
                            ]"
                        />
                        <span class="text-sm text-gray-600 dark:text-gray-400">
                            {{ connected ? "连接正常" : "未连接" }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Quick Connect Options -->
            <UCard
                v-if="!connected"
                class="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
            >
                <div class="flex items-start space-x-3">
                    <UIcon
                        name="i-heroicons-information-circle"
                        class="w-5 h-5 text-blue-500 mt-0.5"
                    />
                    <div class="flex-1">
                        <h4
                            class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2"
                        >
                            快速连接选项
                        </h4>
                        <div class="grid grid-cols-1 gap-2">
                            <UButton
                                @click="
                                    setQuickConnect(
                                        'mongodb://root:123456@localhost:27017'
                                    )
                                "
                                variant="outline"
                                size="sm"
                                class="justify-start"
                                icon="i-heroicons-computer-desktop"
                            >
                                本地数据库
                            </UButton>
                            <UButton
                                @click="
                                    setQuickConnect(
                                        'mongodb://localhost:27017/test'
                                    )
                                "
                                variant="outline"
                                size="sm"
                                class="justify-start"
                                icon="i-heroicons-beaker"
                            >
                                本地测试库
                            </UButton>
                        </div>
                    </div>
                </div>
            </UCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";

const props = defineProps<{
    placeholder?: string;
    initial?: string;
    connected?: boolean;
    loading?: boolean;
}>();

const emit = defineEmits<{
    connect: [uri: string];
}>();

const HISTORY_COOKIE_KEY = "mongo_connections";
const MAX_HISTORY = 10;

const uri = ref(props.initial || "");
const internalLoading = ref(false);
const history = ref<string[]>([]);

// Use external loading state if provided, otherwise use internal state
const isLoading = computed(() => props.loading ?? internalLoading.value);

function readCookie(name: string) {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(
        new RegExp(
            "(?:^|; )" +
                name.replace(/([.*+?^${}()|[\\]\\])/g, "\\$1") +
                "=([^;]*)"
        )
    );
    return m ? decodeURIComponent(m[1]!) : null;
}

function writeCookie(name: string, value: string, days = 30) {
    if (typeof document === "undefined") return;
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(
        value
    )}; path=/; expires=${d.toUTCString()}`;
}

function getHistoryFromCookie(): string[] {
    try {
        const raw = readCookie(HISTORY_COOKIE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((x) => typeof x === "string")
            : [];
    } catch (e) {
        return [];
    }
}

function saveHistoryToCookie(arr: string[]) {
    try {
        writeCookie(HISTORY_COOKIE_KEY, JSON.stringify(arr));
    } catch (e) {
        // ignore
    }
}

function addToHistory(u: string) {
    if (!u || !u.trim()) return;
    const list = getHistoryFromCookie();
    const normalized = u.trim();
    // remove existing occurrence
    const idx = list.indexOf(normalized);
    if (idx !== -1) list.splice(idx, 1);
    list.unshift(normalized);
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
    saveHistoryToCookie(list);
    history.value = list;
}

function clearHistory() {
    saveHistoryToCookie([]);
    history.value = [];
}

// Watch for connection status changes; when a connection becomes active, save the uri
watch(
    () => props.connected,
    (newValue) => {
        if (newValue) {
            internalLoading.value = false;
            if (uri.value && uri.value.trim()) {
                addToHistory(uri.value);
            }
        }
    }
);

onMounted(() => {
    history.value = getHistoryFromCookie();
});

async function connectNow() {
    if (!uri.value.trim()) return;

    if (props.loading === undefined) {
        internalLoading.value = true;
    }

    try {
        emit("connect", uri.value);
    } catch (error) {
        if (props.loading === undefined) {
            internalLoading.value = false;
        }
    }
}

function clearUri() {
    uri.value = "";
}

function setQuickConnect(connectionString: string) {
    uri.value = connectionString;
}
</script>
