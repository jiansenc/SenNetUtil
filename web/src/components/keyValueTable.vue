<template>
  <div class="key-value-table">
    <div class="table-header">
      <div class="header-cell key-cell">{{ keyLabel }}</div>
      <div class="header-cell value-cell">{{ valueLabel }}</div>
      <div class="header-cell action-cell">操作</div>
    </div>
    <div class="table-body">
      <div v-for="(item, index) in tableData" :key="index" class="table-row">
        <div class="table-cell key-cell" @click="startEdit(index, 'key')">
          <input v-if="editingCell.index === index && editingCell.field === 'key'" ref="editInput" v-model="item.key"
            @blur="endEdit" @keyup.enter="endEdit" class="edit-input" placeholder="输入键" />
          <span v-else-if="item.key" class="cell-text">{{ item.key }}</span>
          <span v-else class="cell-placeholder">点击编辑</span>
        </div>
        <div class="table-cell value-cell" @click="startEdit(index, 'value')">
          <input v-if="editingCell.index === index && editingCell.field === 'value'" ref="editInput"
            v-model="item.value" @blur="endEdit" @keyup.enter="endEdit" class="edit-input" placeholder="输入值" />
          <span v-else-if="item.value" class="cell-text">{{ item.value }}</span>
          <span v-else class="cell-placeholder">点击编辑</span>
        </div>
        <div class="table-cell action-cell">
          <useIcon :icon="bullet_delete_icon" @click="deleteRow(index)" class="delete-icon" alt="删除" />
        </div>
      </div>
    </div>
    <div class="table-footer">
      <button @click="addRow" class="add-btn">添加一行</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick, onMounted } from 'vue';
import useIcon from "@/components/useIcon.vue";
import bullet_delete_icon from '@/assets/images/icon/bullet-delete-icon.png'

// 定义props
const props = defineProps({
  initialData: {
    type: Array,
    default: () => []
  },
  keyLabel: {
    type: String,
    default: '键(Key)'
  },
  valueLabel: {
    type: String,
    default: '值(Value)'
  }
});

// 定义事件
const emit = defineEmits(['update:data']);

// 响应式状态
const tableData = ref([]);
const editingCell = reactive({
  index: -1,
  field: null
});
const editInput = ref(null);

// 初始化数据
onMounted(() => {
  tableData.value = props.initialData.length ? [...props.initialData] : [{ key: '', value: '' }];
});

// 监听props变化
watch(() => props.initialData, (newVal) => {
  if (newVal && newVal.length) {
    tableData.value = [...newVal];
  }
}, { deep: true });

// 方法定义
const startEdit = (index, field) => {
  editingCell.index = index;
  editingCell.field = field;

  nextTick(() => {
    if (editInput.value && editInput.value[0]) {
      editInput.value[0].focus();
    }
  });
};

const endEdit = () => {
  emitUpdate();
  editingCell.index = -1;
  editingCell.field = null;
};

const addRow = () => {
  tableData.value.push({ key: '', value: '' });
  emitUpdate();
};

const deleteRow = (index) => {
  tableData.value.splice(index, 1);
  if (tableData.value.length === 0) {
    tableData.value.push({ key: '', value: '' });
  }
  emitUpdate();
};

const emitUpdate = () => {
  emit('update:data', [...tableData.value]);
};
</script>

<style lang="scss" scoped>
.key-value-table {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  background-color: var(--color-background-secondary);
}

.table-header {
  display: flex;
  background-color: var(--color-background-primary);
  border-bottom: 1px solid var(--color-border);
  font-weight: 500;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.table-row {
  display: flex;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }
}

.header-cell,
.table-cell {
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
}

.key-cell {
  flex: 1;
  min-width: 120px;
}

.value-cell {
  flex: 2;
  min-width: 150px;
}

.action-cell {
  width: 80px;
  justify-content: center;
}

.delete-icon {
  transform: scale(0.9);
}

.table-cell {
  min-height: 40px;
  cursor: text;
  word-break: break-all;
}

.cell-text {
  font-family: var(--font-family-mono);
}

.cell-placeholder {
  color: var(--color-text-tertiary);
  font-style: italic;
}

.table-cell.key-cell:hover,
.table-cell.value-cell:hover {
  background-color: var(--color-background-hover);
}

.edit-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-accent);
  border-radius: var(--border-radius-sm);
  outline: none;
  font-family: var(--font-family-mono);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

.table-footer {
  padding: var(--spacing-sm);
  display: flex;
  justify-content: center;
  background-color: var(--color-background-primary);
  border-top: 1px solid var(--color-border);
}

.add-btn {
  background-color: var(--color-accent);
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: var(--transition-fast);

  &:hover {
    background-color: var(--color-accent-dark);
  }
}
</style>
