<template>
    <el-dialog
        v-model="isOpen"
        :title="isEdit ? '编辑文档' : '新建文档'"
        width="80%"
        :before-close="handleClose"
        top="5vh"
    >
        <div class="space-y-4">
            <!-- Document Editor -->
            <div>
                <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                    文档内容 (JSON 格式)
                </label>
                <el-input
                    v-model="documentContent"
                    type="textarea"
                    :rows="15"
                    placeholder="请输入 JSON 格式的文档内容..."
                    class="font-mono"
                    resize="vertical"
                />
            </div>

            <!-- Validation Error -->
            <el-alert
                v-if="validationError"
                :title="validationError"
                type="error"
                :closable="false"
                show-icon
            />

            <!-- Format Helper -->
            <el-card
                class="text-xs text-gray-500 dark:text-gray-400"
                shadow="never"
            >
                <template #header>
                    <span class="text-sm font-medium">提示</span>
                </template>
                <p class="mb-2">请确保输入有效的 JSON 格式。例如：</p>
                <el-scrollbar max-height="120px">
                    <pre
                        class="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs"
                        >{{ exampleJson }}</pre
                    >
                </el-scrollbar>
            </el-card>
        </div>

        <template #footer>
            <div class="flex justify-end space-x-3">
                <el-button @click="closeModal" :disabled="saving">
                    取消
                </el-button>
                <el-button
                    @click="formatDocument"
                    :disabled="saving"
                    :icon="MagicStick"
                >
                    格式化
                </el-button>
                <el-button
                    type="primary"
                    @click="saveDocument"
                    :loading="saving"
                    :icon="Check"
                >
                    {{ isEdit ? "更新" : "创建" }}
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { Check, MagicStick } from "@element-plus/icons-vue";

const props = defineProps<{
    modelValue: boolean;
    document?: any;
    isEdit?: boolean;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    save: [document: any];
}>();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
});

const documentContent = ref("");
const validationError = ref("");
const saving = ref(false);

const exampleJson = `{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com"
}`;

// Watch for document changes
watch(
    () => props.document,
    (newDoc) => {
        if (newDoc && props.isEdit) {
            try {
                documentContent.value = JSON.stringify(newDoc, null, 2);
            } catch (err) {
                documentContent.value = "";
            }
        } else {
            documentContent.value = "";
        }
    },
    { immediate: true }
);

// Watch for modal open/close
watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen && !props.isEdit) {
            documentContent.value = "{\n  \n}";
        }
        validationError.value = "";
    }
);

function formatDocument() {
    try {
        const parsed = JSON.parse(documentContent.value);
        documentContent.value = JSON.stringify(parsed, null, 2);
        validationError.value = "";
    } catch (err: any) {
        validationError.value = "无效的 JSON 格式: " + err.message;
    }
}

function validateDocument() {
    try {
        if (!documentContent.value.trim()) {
            throw new Error("文档内容不能为空");
        }
        const parsed = JSON.parse(documentContent.value);
        validationError.value = "";
        return parsed;
    } catch (err: any) {
        validationError.value = "无效的 JSON 格式: " + err.message;
        return null;
    }
}

async function saveDocument() {
    const parsedDoc = validateDocument();
    if (!parsedDoc) return;

    saving.value = true;
    try {
        emit("save", parsedDoc);
    } finally {
        saving.value = false;
    }
}

function closeModal() {
    emit("update:modelValue", false);
    documentContent.value = "";
    validationError.value = "";
}

function handleClose(done: () => void) {
    if (!saving.value) {
        closeModal();
        done();
    }
}
</script>
