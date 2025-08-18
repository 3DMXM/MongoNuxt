<template>
    <div>
        <div v-if="collections.length === 0" class="text-center py-6">
            <UIcon
                name="i-heroicons-folder"
                class="w-8 h-8 mx-auto text-gray-400 mb-2"
            />
            <p class="text-sm text-gray-500 dark:text-gray-400">暂无集合</p>
        </div>

        <div v-else class="space-y-2">
            <UButton
                v-for="collection in collections"
                :key="collection"
                @click="$emit('select', collection)"
                :variant="activeCollection === collection ? 'solid' : 'ghost'"
                :color="activeCollection === collection ? 'primary' : 'neutral'"
                class="w-full justify-between"
                size="sm"
            >
                <div class="flex items-center space-x-2">
                    <UIcon
                        :name="
                            activeCollection === collection
                                ? 'i-heroicons-folder-open'
                                : 'i-heroicons-folder'
                        "
                        class="w-4 h-4"
                    />
                    <span class="truncate">{{ collection }}</span>
                </div>

                <UIcon
                    v-if="activeCollection === collection"
                    name="i-heroicons-chevron-right"
                    class="w-4 h-4 flex-shrink-0"
                />
            </UButton>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    collections: string[];
    activeCollection?: string | null;
}>();

const emit = defineEmits<{
    select: [collectionName: string];
}>();
</script>
