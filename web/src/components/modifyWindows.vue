<template>
  <el-dialog v-model="isModify" title="修改数据" width="80vw" top="8vh" @close="handleClose" class="custom-dialog">
    <div class="modify-content">
      <div class="url-display">
        <span class="url-label">URL:</span>
        <el-input v-model="modifiedData.url" :disabled="!modifiedData.is_modify_url"
          style="flex: 1; margin-right: 12px;"></el-input>
        <el-switch v-model="modifiedData.is_modify_url" active-text="修改此数据" inline-prompt />
      </div>

      <el-tabs v-model="activeTab" class="modify-tabs">

        <el-tab-pane label="响应" name="response">
          <div class="tab-pane-content">
            <el-form label-position="top">
              <!-- <el-form-item>
                <template #label>
                  <span>响应头</span>
                  <el-switch v-model="modifiedData.is_modify_reponse_head" active-text="修改此数据"
                    style="margin-left: 12px;" inline-prompt />
                </template>
<el-input type="textarea" :rows="8" v-model="modifiedData.reponse_head"
  :disabled="!modifiedData.is_modify_reponse_head"></el-input>
</el-form-item> -->
              <el-form-item>
                <template #label>
                  <span>响应体</span>
                  <el-switch v-model="modifiedData.is_modify_reponse_text" active-text="修改此数据"
                    style="margin-left: 12px;" inline-prompt />
                </template>
                <el-input type="textarea" :rows="8" v-model="modifiedData.reponse_text"
                  :disabled="!modifiedData.is_modify_reponse_text"></el-input>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        <el-tab-pane label="请求" name="request">
          <div class="tab-pane-content">
            <el-form label-position="top">
              <el-form-item>
                <template #label>
                  <span>请求头</span>
                  <el-switch v-model="modifiedData.is_modify_request_head" active-text="修改此数据"
                    style="margin-left: 12px;" inline-prompt />
                </template>
                <el-input type="textarea" :rows="8" v-model="modifiedData.request_head"
                  :disabled="!modifiedData.is_modify_request_head"></el-input>
              </el-form-item>
              <el-form-item>
                <template #label>
                  <span>请求体</span>
                  <el-switch v-model="modifiedData.is_modify_request_text" active-text="修改此数据"
                    style="margin-left: 12px;" inline-prompt />
                </template>
                <el-input type="textarea" :rows="8" v-model="modifiedData.request_text"
                  :disabled="!modifiedData.is_modify_request_text"></el-input>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button size="default" @click="handleClose">取消</el-button>
        <el-button size="default" type="primary" @click="saveChanges">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, reactive, inject } from 'vue';
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['update:modelValue'])
const selectedRowData = inject('selectedRowData')

const isModify = ref(props.modelValue)
const activeTab = ref('response')

const modifiedData = reactive({
  request_head: '',
  request_text: '',
  reponse_head: '',
  reponse_text: '',
  uid: '',
  url: '',
  is_modify_url: false,
  is_modify_request_head: false,
  is_modify_request_text: false,
  is_modify_reponse_head: false,
  is_modify_reponse_text: false,
});

watch(() => props.modelValue, (newVal) => {
  isModify.value = newVal
  if (newVal && selectedRowData.value) {
    // 先将所有字段重置为默认值，以清除上一次打开模态框时可能残留的数据。
    Object.assign(modifiedData, {
      request_head: '',
      request_text: '',
      reponse_head: '',
      reponse_text: '',
      uid: '',
      url: '',
      is_modify_url: false,
      is_modify_request_head: false,
      is_modify_request_text: false,
      is_modify_reponse_head: false,
      is_modify_reponse_text: false,
    });
    // 然后用传入的数据覆盖默认值。
    Object.assign(modifiedData, selectedRowData.value);
  }
})

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}

function saveChanges() {
  const dataToSend = {
    url: modifiedData.url,
    uid: modifiedData.uid,
  };

  let jsonData = {
    enabled: true,
    is_modify_url: modifiedData.is_modify_url,
    is_modify_request_head: modifiedData.is_modify_request_head,
    is_modify_request_text: modifiedData.is_modify_request_text,
    is_modify_reponse_head: modifiedData.is_modify_reponse_head,
    is_modify_reponse_text: modifiedData.is_modify_reponse_text,
  }

  if (modifiedData.is_modify_url) {
    jsonData.url = modifiedData.url
  }
  if (modifiedData.is_modify_request_head) {
    jsonData.request_head = modifiedData.request_head
    selectedRowData.value.request_head = modifiedData.request_head
    selectedRowData.value.modify_flag = 'y'
  }
  if (modifiedData.is_modify_request_text) {
    jsonData.request_text = modifiedData.request_text
    selectedRowData.value.request_text = modifiedData.request_text
  }
  if (modifiedData.is_modify_reponse_head) {
    jsonData.reponse_head = modifiedData.reponse_head
    selectedRowData.value.reponse_head = modifiedData.reponse_head
  }
  if (modifiedData.is_modify_reponse_text) {
    jsonData.reponse_text = modifiedData.reponse_text
    selectedRowData.value.reponse_text = modifiedData.reponse_text
  }

  dataToSend.json = jsonData


  // Logic to save the modified data
  chrome?.webview.postMessage({ type: "modifyItemPush", data: dataToSend })
  ElMessage.success('已添加到拦截列表');
  handleClose();
}

</script>

<style lang="scss" scoped>
.custom-dialog {
  :deep(.el-dialog__body) {
    padding: var(--spacing-lg) var(--spacing-xl);
  }

  :deep(.el-dialog__footer) {
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--color-border);
    background-color: var(--color-background-primary);
  }
}

.modify-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-height: 75vh;
  overflow: hidden;
}

.url-display {
  display: flex;
  align-items: center;
  background-color: var(--color-background-tertiary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  font-family: var(--font-family-mono);
  font-size: 13px;
  border: 1px solid var(--color-border);

  .url-label {
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-right: var(--spacing-sm);
  }
}

.modify-tabs {
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;

  :deep(.el-tabs__header) {
    margin: 0;
    background-color: var(--color-background-primary);
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--color-border);
  }

  :deep(.el-tabs__nav-wrap) {
    display: flex;
    justify-content: center;

    &::after {
      display: none;
    }
  }

  :deep(.el-tabs__nav) {
    border: none !important;
    background-color: var(--color-background-tertiary);
    border-radius: var(--border-radius-md) !important;
    padding: 3px;
    display: inline-flex;
    float: none;
  }

  :deep(.el-tabs__active-bar) {
    display: none;
  }

  :deep(.el-tabs__item) {
    height: 32px;
    line-height: 32px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-secondary);
    border-radius: var(--border-radius-sm);
    border: none !important;
    transition: var(--transition-fast);
    padding: 0 var(--spacing-lg);

    &.is-active {
      color: var(--color-text-primary);
      background-color: var(--color-background-secondary);
      box-shadow: var(--shadow-sm);
    }

    &:hover:not(.is-active) {
      color: var(--color-text-primary);
    }
  }

  :deep(.el-tabs__content) {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
  }
}

.tab-pane-content {
  padding: 0;
}

:deep(.el-form-item__label) {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.dialog-footer {
  text-align: right;
}
</style>