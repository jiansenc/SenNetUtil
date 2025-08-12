<template>
  <el-dialog v-model="isVisible" title="拦截列表" width="80vw" top="8vh" class="intercept-dialog">
    <div class="intercept-content">
      <div class="toolbar">
        <el-input v-model="searchQuery" placeholder="搜索URL" clearable @clear="handleSearch" @input="handleSearch">
          <template #prefix>
            <i class="bi bi-search" style="font-size: 16px; margin-right: 8px;"></i>
          </template>
        </el-input>
        <div class="actions">
          <el-button type="primary" @click="addNewIntercept"><i class="bi bi-plus-lg"></i> 添加拦截</el-button>
          <el-button type="danger" :disabled="!hasSelected" @click="batchDelete"><i class="bi bi-trash"></i>
            批量删除</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="filteredInterceptList" row-key="url" style="width: 100%" border stripe
        @selection-change="handleSelectionChange" height="calc(75vh - 130px)">
        <el-table-column type="selection" width="55" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.json.enabled" @change="(val) => toggleStatus(row, val)" />
          </template>
        </el-table-column>
        <el-table-column prop="url" label="URL" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="url-cell">
              <el-tooltip :content="row.url" placement="top" :show-after="500">
                <span class="url-text">{{ row.url }}</span>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="修改类型" width="200">
          <template #default="{ row }">
            <div class="modification-types">
              <el-tag v-if="row.json.is_modify_request_head" size="small" type="warning">请求头</el-tag>
              <el-tag v-if="row.json.is_modify_request_text" size="small" type="danger">请求体</el-tag>
              <el-tag v-if="row.json.is_modify_reponse_head" size="small" type="success">响应头</el-tag>
              <el-tag v-if="row.json.is_modify_reponse_text" size="small" type="primary">响应体</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="operation-buttons">
              <el-button type="primary" size="small" @click="editIntercept(row)"><i
                  class="bi bi-pencil"></i></el-button>
              <el-button @click="deleteIntercept(row)" type="danger" size="small"><i
                  class="bi bi-trash"></i></el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

    </div>
  </el-dialog>

  <!-- 修改弹窗组件 -->
  <modify-windows v-model="showModifyDialog" @close="handleClose" />
</template>

<script setup>
import { ref, computed, inject, provide, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ModifyWindows from './modifyWindows.vue';
import emitter from '@/utils/emitter';


const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

emitter.on('interceptListShow', (list) => {
  console.log(list);
  interceptList.value = list.map(item => {
    item.json = JSON.parse(item.value)
    item.url = item.key
    item.enabled = item.json.enabled
    delete item.value
    return item
  })
});

const emit = defineEmits(['update:modelValue']);

const isVisible = ref(props.modelValue);
const interceptList = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedRows = ref([]);
const showModifyDialog = ref(false);
const selectedRowData = ref(null);

// 提供选中行数据给修改弹窗
provide('selectedRowData', selectedRowData);

// 监听父组件传入的显示状态
watch(() => props.modelValue, (newVal) => {
  isVisible.value = newVal;
});

// 监听本地显示状态变化，通知父组件
watch(() => isVisible.value, (newVal) => {
  emit('update:modelValue', newVal);
});

function handleSearch() {
  console.log(searchQuery.value);
}

// 过滤后的列表数据
const filteredInterceptList = computed(() => {
  if (!searchQuery.value) {
    return interceptList.value;
  }

  const query = searchQuery.value.toLowerCase();
  return interceptList.value.filter(item =>
    item.url.toLowerCase().includes(query)
  );
});

// 是否有选中项
const hasSelected = computed(() => selectedRows.value.length > 0);

function handleClose() {
  showModifyDialog.value = false;
  chrome?.webview.postMessage({ type: "interceptListShow" })
}


// 添加新拦截
function addNewIntercept() {
  selectedRowData.value = {
    url: '',
    request_head: '',
    request_text: '',
    reponse_head: '',
    reponse_text: '',
    uid: Date.now().toString(),
    is_modify_url: true,
    is_modify_request_head: false,
    is_modify_request_text: false,
    is_modify_reponse_head: false,
    is_modify_reponse_text: false,
  };
  showModifyDialog.value = true;
}

// 编辑拦截项
function editIntercept(row) {
  selectedRowData.value = { ...row.json, url: row.url, uid: row.id };
  showModifyDialog.value = true;
}

// 删除拦截项
function deleteIntercept(row) {
  chrome?.webview.postMessage({ type: "deleteIntercept", data: { url: row.url } });
  interceptList.value = interceptList.value.filter(item => item.url !== row.url);
  ElMessage.success('删除成功');
}

// 批量删除
function batchDelete() {
  if (selectedRows.value.length === 0) return;

  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedRows.value.length} 项吗？`,
    '批量删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    console.log(selectedRows.value)
    const ids = selectedRows.value.map(row => {
      return {
        key: row.url
      }
    });
    chrome?.webview.postMessage({ type: "batchDeleteIntercept", data: { urls: ids } });
    interceptList.value = interceptList.value.filter(item => !ids.includes(item.url));
    // interceptList.value = interceptList.value.filter(item => !ids.includes(item.url));
    ElMessage.success(`成功删除 ${ids.length} 项`);
  }).catch(() => {
    // 用户取消操作
  });
}



// 切换拦截状态
function toggleStatus(row, status) {
  // 实际实现中应该调用webview
  // chrome?.webview.postMessage({ 
  //   type: "toggleInterceptStatus", 
  //   data: { id: row.id, enabled: status } 
  // });

  ElMessage.success(`${status ? '启用' : '禁用'}成功`);
}

// 表格选择变化
function handleSelectionChange(rows) {
  selectedRows.value = rows;
}


</script>

<style lang="scss" scoped>
.intercept-dialog {
  :deep(.el-dialog__body) {
    padding: var(--spacing-lg) var(--spacing-xl);
  }

  :deep(.el-dialog__header) {
    padding: var(--spacing-md) var(--spacing-xl);
    margin: 0;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-background-primary);
  }
}

.intercept-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-height: 75vh;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);

  .el-input {
    width: 300px;
  }

  .actions {
    display: flex;
    gap: var(--spacing-sm);

    .el-button .bi {
      margin-right: 6px;
      font-size: 14px;
      vertical-align: -1px;
    }
  }
}

.url-cell {
  display: flex;
  align-items: center;

  .url-text {
    font-family: var(--font-family-mono);
    font-size: 13px;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.modification-types {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  .no-mods {
    color: var(--color-text-secondary);
    font-size: 12px;
    font-style: italic;
  }
}

.operation-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;

  .el-button .bi {
    font-size: 14px;
  }
}
</style>
