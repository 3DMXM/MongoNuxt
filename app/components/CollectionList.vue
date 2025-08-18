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
                @contextmenu.prevent="openMenu(collection, $event)"
                :variant="activeCollection === collection ? 'solid' : 'ghost'"
                :color="activeCollection === collection ? 'primary' : 'neutral'"
                class="w-full justify-between text-left"
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

        <!-- Context menu -->
        <div
            v-if="menuVisible"
            :style="{
                position: 'fixed',
                top: menuY + 'px',
                left: menuX + 'px',
                zIndex: 10000,
            }"
            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl backdrop-blur-sm min-w-[140px]"
            @click.stop
        >
            <div class="py-1">
                <div
                    class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors duration-150"
                    @click="onManageIndexes"
                >
                    <UIcon
                        name="i-heroicons-list-bullet"
                        class="w-4 h-4 mr-3"
                    />
                    <span>索引管理</span>
                </div>

                <div
                    class="border-t border-gray-100 dark:border-gray-700 my-1"
                ></div>

                <div
                    class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-colors duration-150"
                    @click="onRename"
                >
                    <UIcon name="i-heroicons-pencil" class="w-4 h-4 mr-3" />
                    <span>重命名</span>
                </div>

                <div
                    class="border-t border-gray-100 dark:border-gray-700 my-1"
                ></div>

                <div
                    class="flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 cursor-pointer transition-colors duration-150"
                    @click="onDelete"
                >
                    <UIcon name="i-heroicons-trash" class="w-4 h-4 mr-3" />
                    <span>删除</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const props = defineProps<{
    collections: string[];
    activeCollection?: string | null;
}>();

const emit = defineEmits<{
    select: [collectionName: string];
    "manage-indexes": [collectionName: string];
    "rename-collection": [collectionName: string];
    "delete-collection": [collectionName: string];
}>();

const menuVisible = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuTarget = ref<string | null>(null);

function openMenu(collection: string, e: MouseEvent) {
    menuTarget.value = collection;
    menuX.value = e.clientX;
    menuY.value = e.clientY;
    menuVisible.value = true;
}

function hideMenu() {
    menuVisible.value = false;
    menuTarget.value = null;
}

function onManageIndexes() {
    if (menuTarget.value) emit("manage-indexes", menuTarget.value);
    hideMenu();
}

function onRename() {
    if (menuTarget.value) emit("rename-collection", menuTarget.value);
    hideMenu();
}

function onDelete() {
    if (menuTarget.value) emit("delete-collection", menuTarget.value);
    hideMenu();
}

function onDocClick() {
    hideMenu();
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") hideMenu();
}

onMounted(() => {
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onKeydown);
});
</script>
