<template>
    <el-dialog
        v-model="isOpen"
        title="确认删除"
        width="600px"
        :before-close="handleClose"
        align-center
    >
        <template #header>
            <div class="flex items-center space-x-2">
                <el-icon class="text-red-500" size="20">
                    <Warning />
                </el-icon>
                <span class="text-lg font-semibold">确认删除</span>
            </div>
        </template>

        <div class="space-y-4">
            <p class="text-gray-600 dark:text-gray-400">
                您确定要删除这个文档吗？此操作无法撤销。
            </p>

            <div
                v-if="document"
                class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border"
            >
                <p
                    class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                    要删除的文档：
                </p>
                <el-scrollbar max-height="200px">
                    <pre class="text-xs text-gray-600 dark:text-gray-400">{{
                        formatJson(document)
                    }}</pre>
                </el-scrollbar>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end space-x-3">
                <el-button @click="closeModal" :disabled="deleting">
                    取消
                </el-button>
                <el-button
                    type="danger"
                    @click="confirmDelete"
                    :loading="deleting"
                    :icon="Delete"
                >
                    删除
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Warning, Delete } from "@element-plus/icons-vue";

const props = defineProps<{
    modelValue: boolean;
    document?: any;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    delete: [];
}>();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
});

const deleting = ref(false);

function formatJson(obj: any) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

async function confirmDelete() {
    deleting.value = true;
    try {
        emit("delete");
    } finally {
        deleting.value = false;
    }
}

function closeModal() {
    emit("update:modelValue", false);
}

function handleClose(done: () => void) {
    if (!deleting.value) {
        done();
    }
}
</script>
