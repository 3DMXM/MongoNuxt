<template>
    <div>
        <div v-if="databases.length === 0" class="text-center py-6">
            <UIcon
                name="i-heroicons-circle-stack"
                class="w-8 h-8 mx-auto text-gray-400 mb-2"
            />
            <p class="text-sm text-gray-500 dark:text-gray-400">暂无数据库</p>
        </div>

        <div v-else class="space-y-2">
            <UButton
                v-for="db in databases"
                :key="db.name"
                @click="$emit('select', db.name)"
                :variant="activeDb === db.name ? 'solid' : 'ghost'"
                :color="activeDb === db.name ? 'primary' : 'neutral'"
                class="w-full justify-between"
                size="sm"
            >
                <div class="flex items-center space-x-2">
                    <UIcon
                        :name="
                            activeDb === db.name
                                ? 'i-heroicons-circle-stack-solid'
                                : 'i-heroicons-circle-stack'
                        "
                        class="w-4 h-4"
                    />
                    <span>{{ db.name }}</span>
                </div>

                <div class="flex items-center space-x-2">
                    <UBadge v-if="db.sizeOnDisk" variant="soft" size="xs">
                        {{ formatSize(db.sizeOnDisk) }}
                    </UBadge>
                    <UIcon
                        v-if="activeDb === db.name"
                        name="i-heroicons-chevron-right"
                        class="w-4 h-4"
                    />
                </div>
            </UButton>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    databases: Array<any>;
    activeDb?: string | null;
}>();

const emit = defineEmits<{
    select: [dbName: string];
}>();

function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
</script>
