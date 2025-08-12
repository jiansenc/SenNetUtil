<template>
  <el-dialog @close="handleClose" title="标记URL" v-model="isFlagURI" width="500px" class="custom-dialog">
    <div class="flag-uri-content">
      <div class="url-display">
        <span class="url-label">URL:</span>
        <span class="url-value" :style="{ color: selectedColorValue }">{{ flagURI }}</span>
      </div>

      <div class="color-picker">
        <div class="color-picker-label">选择颜色:</div>
        <div class="color-grid">
          <div v-for="item in predefineColors" :key="item.class" class="color-item-wrapper">
            <div class="color-item" :style="{ backgroundColor: item.color }"
              :class="{ 'active': colorClass === item.class }" @click="handleSelectColor(item)">
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button size="medium" @click="handleClose">取消</el-button>
        <el-button size="medium" type="primary" @click="handleFlagURI">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { inject } from 'vue'

const selectedRowData = inject('selectedRowData')

const colorClass = ref('flag-red')
const predefineColors = ref([
  { color: '#ff4500', class: 'flag-red', name: '红色' },
  { color: '#ff8c00', class: 'flag-orange', name: '橙色' },
  { color: '#ffd700', class: 'flag-yellow', name: '黄色' },
  { color: '#90ee90', class: 'flag-lightgreen', name: '浅绿' },
  { color: '#00ced1', class: 'flag-cyan', name: '青色' },
  { color: '#1e90ff', class: 'flag-blue', name: '蓝色' },
  { color: '#c71585', class: 'flag-magenta', name: '洋红' },
  { color: '#ff1493', class: 'flag-pink', name: '粉色' },
  { color: '#00bfff', class: 'flag-skyblue', name: '天蓝' },
  { color: '#18b4ed', class: 'flag-lightblue', name: '浅蓝' }
])

const selectedColorValue = computed(() => {
  return predefineColors.value.find(c => c.class === colorClass.value)?.color || '#ff4500';
});

const emit = defineEmits(['update:modelValue'])
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const isFlagURI = ref(props.modelValue)
const flagURI = ref('')

watch(() => props.modelValue, (newVal) => {
  isFlagURI.value = newVal
  if (newVal) {
    flagURI.value = selectedRowData.value.url
  }
}, {
  immediate: true
})

function handleClose() {
  emit('update:modelValue', false)
}

function handleSelectColor(selected) {
  colorClass.value = selected.class
}

function handleFlagURI() {
  chrome?.webview.postMessage({ type: "setURLFalg", data: { url: flagURI.value, color: colorClass.value } })
  selectedRowData.value.url_flag = 'y'
  selectedRowData.value.flag_color = colorClass.value
  ElMessage.success('标记成功')
  handleClose()
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

.flag-uri-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.url-display {
  background-color: var(--color-background-tertiary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  font-family: var(--font-family-mono);
  font-size: 13px;

  .url-label {
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-right: var(--spacing-sm);
  }

  .url-value {
    word-break: break-all;
  }
}

.color-picker-label {
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
  gap: var(--spacing-md);
}

.color-item-wrapper {
  display: flex;
  justify-content: center;
}

.color-item {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 3px solid var(--color-background-secondary);
  box-shadow: var(--shadow-sm);

  &:hover {
    transform: scale(1.1);
  }

  &.active {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent);
  }
}
</style>