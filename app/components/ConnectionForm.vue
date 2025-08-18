<template>
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
        </div>

        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <UButton
                    @click="connectNow"
                    :loading="isLoading"
                    :disabled="!uri.trim() || connected"
                    size="lg"
                    icon="i-heroicons-play"
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
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <UButton
                            @click="
                                setQuickConnect('mongodb://localhost:27017')
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
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";

const props = defineProps<{
    placeholder?: string;
    initial?: string;
    connected?: boolean;
    loading?: boolean;
}>();

const emit = defineEmits<{
    connect: [uri: string];
}>();

const uri = ref(props.initial || "");
const internalLoading = ref(false);

// Use external loading state if provided, otherwise use internal state
const isLoading = computed(() => props.loading ?? internalLoading.value);

// Watch for connection status changes
watch(
    () => props.connected,
    (newValue) => {
        if (newValue) {
            internalLoading.value = false;
        }
    }
);

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
