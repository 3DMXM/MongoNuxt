<template>
    <el-dialog append-to-body v-model="visible" width="700px" title="索引管理">
        <div class="mb-4">
            <el-button type="primary" size="small" @click="openCreateForm"
                >新建索引</el-button
            >
        </div>

        <el-table :data="indexes" style="width: 100%">
            <el-table-column prop="name" label="索引名" />
            <el-table-column label="键">
                <template #default="{ row }">{{ formatKey(row.key) }}</template>
            </el-table-column>
            <el-table-column label="选项">
                <template #default="{ row }">{{ formatOptions(row) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180">
                <template #default="{ row }">
                    <el-button size="small" @click="openEditForm(row)"
                        >修改</el-button
                    >
                    <el-button
                        size="small"
                        type="danger"
                        @click="confirmDelete(row)"
                        >删除</el-button
                    >
                </template>
            </el-table-column>
        </el-table>

        <!-- Create / Edit Form -->
        <el-dialog
            v-model="showForm"
            :title="formMode === 'create' ? '新建索引' : '修改索引'"
            width="600px"
        >
            <div class="space-y-3">
                <el-input
                    v-model="form.indexName"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    placeholder="索引名称（可选, create 时通常留空）"
                />
                <el-input
                    v-model="form.indexKey"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    placeholder='索引键，JSON，例如: {"name":1}'
                />
                <el-input
                    v-model="form.indexOptions"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    placeholder='选项，JSON，例如: {"unique":true}'
                />
            </div>

            <template #footer>
                <div class="flex justify-end space-x-2">
                    <el-button @click="showForm = false">取消</el-button>
                    <el-button type="primary" @click="submitForm"
                        >确定</el-button
                    >
                </div>
            </template>
        </el-dialog>

        <!-- Delete Confirm -->
        <el-dialog v-model="showDeleteConfirm" title="确认删除索引">
            <div>
                确认删除索引：<strong>{{ deletingIndex?.name }}</strong> ?
            </div>
            <template #footer>
                <div class="flex justify-end space-x-2">
                    <el-button @click="showDeleteConfirm = false"
                        >取消</el-button
                    >
                    <el-button type="danger" @click="deleteIndex"
                        >删除</el-button
                    >
                </div>
            </template>
        </el-dialog>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive, computed } from "vue";
import { ElMessage } from "element-plus";
import { useMongoStore } from "../../stores/mongo";

const props = defineProps<{
    db: string;
    collection: string;
}>();
// const emit = defineEmits(["update:visible"]);

const visible = defineModel<boolean>("visible");

const store = useMongoStore();
const indexes = ref<any[]>([]);
const loading = ref(false);

const showForm = ref(false);
const formMode = ref<"create" | "edit">("create");
const form = reactive({ indexName: "", indexKey: "", indexOptions: "" });
const showDeleteConfirm = ref(false);
const deletingIndex = ref<any | null>(null);

watch(visible, async (v) => {
    await loadIndexes();
});

// v-model:visible binding helper
// const dialogVisible = computed({
//     get: () => visible,
//     set: (v: boolean) => emit("update:visible", v),
// });

async function loadIndexes() {
    if (!props.db || !props.collection) return;
    loading.value = true;
    try {
        const res = await (globalThis as any).$fetch(
            `/api/mongo/index/list?db=${encodeURIComponent(
                props.db
            )}&collection=${encodeURIComponent(props.collection)}`
        );
        indexes.value = (res as any).indexes || [];
    } catch (err: any) {
        ElMessage.error("加载索引失败: " + (err.message || String(err)));
    } finally {
        loading.value = false;
    }
}

function formatKey(keyObj: any) {
    try {
        return JSON.stringify(keyObj);
    } catch {
        return String(keyObj);
    }
}

function formatOptions(row: any) {
    const opts = { ...row };
    delete opts.key;
    delete opts.ns;
    delete opts.v;
    return JSON.stringify(opts);
}

function openCreateForm() {
    formMode.value = "create";
    form.indexName = "";
    form.indexKey = "";
    form.indexOptions = "";
    showForm.value = true;
}

function openEditForm(row: any) {
    formMode.value = "edit";
    form.indexName = row.name;
    form.indexKey = JSON.stringify(row.key);
    form.indexOptions = JSON.stringify(row);
    showForm.value = true;
}

async function submitForm() {
    if (!props.db || !props.collection) return;

    let indexSpec: any = {};
    let options: any = {};

    try {
        indexSpec = JSON.parse(form.indexKey || "{}");
        options = form.indexOptions ? JSON.parse(form.indexOptions) : {};
    } catch (err: any) {
        ElMessage.error("索引键或选项 JSON 格式错误");
        return;
    }

    try {
        if (formMode.value === "create") {
            const res = await store.createIndex(
                props.db,
                props.collection,
                indexSpec,
                options
            );
            ElMessage.success("索引已创建: " + (res as any).indexName);
        } else {
            const res = await store.updateIndex(
                props.db,
                props.collection,
                form.indexName,
                indexSpec,
                options
            );
            ElMessage.success("索引已更新: " + (res as any).indexName);
        }
        showForm.value = false;
        await loadIndexes();
    } catch (err: any) {
        ElMessage.error("操作失败: " + (err.message || String(err)));
    }
}

function confirmDelete(row: any) {
    deletingIndex.value = row;
    showDeleteConfirm.value = true;
}

async function deleteIndex() {
    if (!props.db || !props.collection || !deletingIndex.value) return;
    try {
        const res = await store.deleteIndex(
            props.db,
            props.collection,
            deletingIndex.value.name
        );
        ElMessage.success("索引已删除");
        showDeleteConfirm.value = false;
        await loadIndexes();
    } catch (err: any) {
        ElMessage.error("删除失败: " + (err.message || String(err)));
    }
}

// nothing else to expose
</script>
