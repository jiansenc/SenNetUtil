<template>
  <el-dialog title="设置" v-model="isOpen" @close="handleClose" width="700px" top="8vh" class="custom-dialog">
    <div class="settings-content">
      <el-form label-position="top" label-width="120px">
        <el-tabs v-model="tabActive" class="settings-tabs">
          <el-tab-pane label="常规" name="1">
            <div class="tab-pane-content">
              <el-form-item label="禁用浏览器缓存">
                <template #label>
                  <span>禁用浏览器缓存</span>
                  <el-tooltip
                    content="开启后，所有请求的 request-header 中将强制添加 'Cache-Control: no-cache'，并移除 'If-Modified-Since' 和 'If-None-Match'。">
                    <i class="bi bi-info-circle help-icon"></i>
                  </el-tooltip>
                </template>
                <el-switch @change="handleCacheChange" v-model="saveInfo.disableCache" />
              </el-form-item>
            </div>
          </el-tab-pane>

          <el-tab-pane label="请求头" name="2">
            <p>这个还没有开发,哈哈哈~</p>
            <div class="tab-pane-content">
              <el-form-item label="全局请求头">
                <KeyValueTable keyLabel="键(Key)" valueLabel="值(Value)" :initialData="saveInfo.common_requestHeader" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <span>按规则设置请求头</span>
                  <el-tooltip raw-content placement="top-start"
                    content="为指定路径的请求设置请求头, 支持正则表达式.<br/>多个请求头请用 ; 分开, 例如: <b>Cache-Control: no-cache; Content-Type: application/json</b>">
                    <i class="bi bi-info-circle help-icon"></i>
                  </el-tooltip>
                </template>
                <KeyValueTable keyLabel="匹配路径 (支持正则)" valueLabel="请求头" :initialData="saveInfo.rule_requestHeader" />
              </el-form-item>
            </div>
          </el-tab-pane>
          <el-tab-pane label="关于" name="3">
            <div class="about-content">
              <img class="logo" :src="iconlogo" alt="">
              <p class="p1">SenNetUtil</p>
              <div class="dt">
                基于易语言,SenNetUtil,edgeview 开发的HTTP调试工具。
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-form>
    </div>
    <template v-if="tabActive !== '3'" #footer>
      <div class="dialog-footer">
        <el-button size="default" @click="handleClose">取消</el-button>
        <el-button size="default" type="primary" @click="saveSettings">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import KeyValueTable from './keyValueTable.vue'
import { ElMessage } from 'element-plus'
import { callWebview } from '@/utils/index.js'
import iconlogo from '@/assets/images/icon/emojimix.png'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const tabActive = ref('1')

const isOpen = ref(props.modelValue)
const saveInfo = reactive({
  disableBrowserCache: false,
  common_requestHeader: [],
  rule_requestHeader: []
})

watch(() => props.modelValue, (newVal) => {
  isOpen.value = newVal
  if (newVal) {
    //
  }
})

const emit = defineEmits(['update:modelValue'])

const handleClose = () => {
  emit('update:modelValue', false)
}

const saveSettings = () => {
  // Here you would typically send the data to the backend/main process
  chrome?.webview.postMessage({ type: "saveSettings", data: saveInfo })
  ElMessage.success('设置已保存');
  handleClose();
}

const handleCacheChange = (value) => {
  callWebview('disableBrowserCache', { disableBrowserCache: value })
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

.about-content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 300px;

  .logo {
    width: 100px;
    height: 100px;
  }

  .p1 {
    font-size: 24px;
  }

  .dt {
    margin-top: 10px;
    color: #969696;
  }
}

.settings-content {
  padding: 0;
}

.settings-tabs {
  border: none;

  :deep(.el-tabs__header) {
    background-color: var(--color-background-primary);
    border-bottom: 1px solid var(--color-border);
    padding: var(--spacing-sm);
  }

  :deep(.el-tabs__nav-wrap) {
    &::after {
      display: none;
    }
  }

  :deep(.el-tabs__nav) {
    border: none !important;
    background-color: var(--color-background-tertiary);
    border-radius: var(--border-radius-md) !important;
    padding: 3px;
    display: flex;
    justify-content: center;
    width: 100%;
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
    margin: 0 !important;

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
    padding: 0;
  }
}

.tab-pane-content {
  padding: var(--spacing-lg);
  max-height: 60vh;
  overflow-y: auto;
}

.el-form-item {
  margin-bottom: var(--spacing-xl);
}

:deep(.el-form-item__label) {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  line-height: 1.2 !important;
  margin-bottom: var(--spacing-sm) !important;
}

.help-icon {
  color: var(--color-text-tertiary);
  cursor: help;
}
</style>