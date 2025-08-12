<template>
  <div class="index-container">
    <menuBar @clear="clearData" />
    <div class="filter-bar">
      <el-input v-model="filterText" placeholder="根据URL筛选..." clearable prefix-icon="Search" @input="debouncedFilter">
        <template #append>
          <el-select v-model="filterMethod" placeholder="请求方法" clearable style="width: 110px">
            <el-option v-for="method in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']" :key="method" :label="method"
              :value="method" />
          </el-select>
        </template>
      </el-input>

      <el-select v-model="filterStatus" placeholder="状态码" clearable style="width: 120px">
        <el-option-group label="成功">
          <el-option v-for="code in [200, 201, 204]" :key="code" :label="`${code}`" :value="code" />
        </el-option-group>
        <el-option-group label="重定向">
          <el-option v-for="code in [301, 302, 304]" :key="code" :label="`${code}`" :value="code" />
        </el-option-group>
        <el-option-group label="客户端错误">
          <el-option v-for="code in [400, 401, 403, 404]" :key="code" :label="`${code}`" :value="code" />
        </el-option-group>
        <el-option-group label="服务端错误">
          <el-option v-for="code in [500, 502, 503, 504]" :key="code" :label="`${code}`" :value="code" />
        </el-option-group>
      </el-select>

      <el-select v-model="filterType" placeholder="资源类型" clearable style="width: 150px">
        <el-option label="HTML" value="text/html" />
        <el-option label="JSON" value="application/json" />
        <el-option label="JavaScript" value="application/javascript" />
        <el-option label="CSS" value="text/css" />
        <el-option label="图片" value="image" />
      </el-select>

      <el-button @click="clearFilters" class="clear-btn">
        <i class="bi bi-x-circle"></i>
        <span>清空</span>
      </el-button>

      <div class="data-stats">
        <span>{{ filteredData.length }} / {{ dataStore.length }} 条请求</span>
      </div>
    </div>

    <div class="index-container-content" :style="{ height: `calc(100vh - ${98}px)` }">
      <div v-if="dataStore.length > 0" class="table-container"
        :style="{ width: `calc(100% - ${viewDataWidth}px - 5px)` }">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2 ref="tableRef" :columns="columns" :data="visibleData" :width="width" :height="height"
              :row-height="32" :header-height="40" fixed :row-event-handlers="{ onClick: handleRowClick }"
              :row-class="getRowClass" header-class="table-header" @scroll="handleTableScroll" />
          </template>
        </el-auto-resizer>
      </div>
      <div v-else class="empty-list-state">
        <img src="@/assets/images/icon/box-search-icon.png" alt="Waiting for requests" class="empty-state-icon" />
        <p>等待请求中...</p>
        <p class="sub-text">启动监听后，所有HTTP请求将在这里显示</p>
      </div>

      <div class="resizer" @mousedown="startResize" :class="{ 'resizing': isResizing }"></div>

      <viewData :data="selectedRowData" :style="{ width: `${viewDataWidth}px` }"
        :key="`view-${selectedRowId || 'empty'}`" />
    </div>

    <div class="scroll-to-top" v-show="showScrollTop" @click.stop="scrollToTop" title="回到顶部">
      <i class="bi bi-arrow-up"></i>
    </div>

    <el-backtop :right="viewDataWidth + 20" :visibility-height="200" />
  </div>
</template>

<script setup>
import menuBar from "@/components/menuBar.vue";
import viewData from "@/components/viewData.vue";
import { ref, computed, reactive, onMounted, onUnmounted, watch, nextTick, h, inject, provide } from 'vue';
import { debounce } from 'lodash-es';
import emitter from '@/utils/emitter';
import { ElMessage } from 'element-plus'


// 状态管理
const windowsHeight = ref(document.documentElement.clientHeight);
const viewDataWidth = ref(450);
const selectedRowId = ref(null);
const selectedRowData = ref({});

provide('selectedRowData', selectedRowData)
const isResizing = ref(false);
const showScrollTop = ref(false);
const scrollPosition = ref(0);
const tableRef = ref(null); // 添加表格引用

// 过滤相关
const filterText = ref('');
const filterMethod = ref('');
const filterStatus = ref('');
const filterType = ref('');

// 创建高性能数据存储
const dataStore = reactive([]);
const MAX_DATA_LENGTH = 50000; // 最大数据条数

// 虚拟列表相关
const VISIBLE_ITEMS_COUNT = 120; // 增加可见数据条数，减少滚动抖动
const visibleDataStartIndex = ref(0);
let isScrolling = false; // 跟踪滚动状态

// HTTP状态映射
const httpStatus = {
  1: '请求中',
  2: '成功',
  3: '失败',
};

// 方法类型颜色映射
const methodColors = {
  GET: 'success',
  POST: 'warning',
  PUT: 'primary',
  DELETE: 'danger',
  PATCH: 'info',
  OPTIONS: '',
  HEAD: ''
};

// 表格列定义
const columns = [
  { key: 'index', title: '#', dataKey: 'index', width: 60 },
  {
    key: 'url',
    title: 'URL',
    dataKey: 'url',
    width: 500,
    cellRenderer: ({ cellData, rowData }) => {
      // 如果URL被标记，则应用对应的颜色类
      if (rowData.url_flag === 'y' && rowData.flag_color) {
        return h(
          'div',
          {
            class: 'url-cell-container',
            title: cellData, // 添加title属性显示完整URL
            style: 'white-space: nowrap !important; word-break: keep-all !important; overflow: hidden;'
          },
          [
            h('span', {
              class: `url-text ${rowData.flag_color}`,
              style: 'white-space: nowrap !important; word-break: keep-all !important; overflow: hidden;'
            }, cellData)
          ]
        )
      }
      return h(
        'div',
        {
          class: 'url-cell-container',
          title: cellData, // 添加title属性显示完整URL
          style: 'white-space: nowrap !important; word-break: keep-all !important; overflow: hidden;'
        },
        [
          h('span', {
            class: 'url-text',
            style: 'white-space: nowrap !important; word-break: keep-all !important; overflow: hidden;'
          }, cellData)
        ]
      )
    }
  },
  {
    key: 'methods',
    title: '方法',
    dataKey: 'methods',
    width: 80,
    cellRenderer: ({ cellData }) => {
      return h(
        'span',
        {
          class: `method ${cellData || 'GET'}`,
        },
        cellData
      )
    }
  },
  {
    key: 'status',
    title: '状态',
    dataKey: 'response_status',
    width: 80,
    cellRenderer: ({ cellData }) => {
      return h(
        'span',
        {
          class: `status status-${cellData || '200'}`,
        },
        cellData
      )
    }
  },
  {
    key: 'res_type',
    title: '资源类型',
    dataKey: 'res_type',
    width: 150,
    cellRenderer: ({ cellData }) => {
      if (!cellData) return '';
      // 简化内容类型显示
      const mainType = cellData.split('/')[1]?.split(';')[0] || cellData;
      return h('span', { class: `res-type res-type-${mainType}` }, mainType);
    }
  },
  {
    key: 'create_time',
    title: '时间',
    dataKey: 'create_time',
    width: 150,
    cellRenderer: ({ cellData }) => {
      if (!cellData) return '';
      try {
        const date = new Date(cellData);
        return date.toLocaleTimeString(); // 只显示时间部分，减少宽度占用
      } catch (e) {
        return cellData;
      }
    }
  },
  { key: 'httpStatus', title: '状态', dataKey: 'httpStatus', width: 100 },
  { key: 'uid', title: 'UID', dataKey: 'uid', width: 100 },
];

// 过滤数据计算属性
const filteredData = computed(() => {
  return dataStore.filter(item => {
    let match = true;

    if (filterText.value) {
      match = match && item.url?.toLowerCase().includes(filterText.value.toLowerCase());
    }

    if (filterMethod.value) {
      match = match && item.methods === filterMethod.value;
    }

    if (filterStatus.value) {
      match = match && Number(item.response_status) === filterStatus.value;
    }

    if (filterType.value) {
      if (filterType.value === 'image') {
        match = match && item.res_type?.startsWith('image/');
      } else {
        match = match && item.res_type?.startsWith(filterType.value);
      }
    }

    return match;
  });
});

// 获取当前可见数据
const visibleData = computed(() => {
  const start = visibleDataStartIndex.value;
  // 增加缓冲区大小以防止滚动抖动
  const end = Math.min(start + VISIBLE_ITEMS_COUNT + 20, filteredData.value.length);
  return filteredData.value.slice(start, end);
});

// 使用防抖的过滤函数
const debouncedFilter = debounce(() => {
  // 过滤后重置滚动位置
  visibleDataStartIndex.value = 0;

  // 手动重置表格滚动位置
  nextTick(() => {
    const tableRef = document.querySelector('.el-table-v2__main .el-scrollbar__wrap');
    if (tableRef) {
      tableRef.scrollTop = 0;
    }
  });

  if (selectedRowId.value) {
    // 检查选中项是否在过滤结果中
    const stillExists = filteredData.value.some(item => generateRowId(item) === selectedRowId.value);
    if (!stillExists) {
      selectedRowId.value = null;
      selectedRowData.value = {};
    }
  }
}, 300);

// 清除所有过滤条件
const clearFilters = () => {
  filterText.value = '';
  filterMethod.value = '';
  filterStatus.value = '';
  filterType.value = '';
  debouncedFilter();
};

// 清除所有数据
const clearData = () => {
  dataStore.length = 0;
  selectedRowId.value = null;
  selectedRowData.value = {};
  visibleDataStartIndex.value = 0;
};

// 表格滚动处理
const handleTableScroll = ({ scrollTop, scrollLeft }) => {
  scrollPosition.value = scrollTop;
  showScrollTop.value = scrollTop > 300;

  // 计算应该显示哪些数据
  const rowHeight = 32; // 行高
  const startIndex = Math.floor(scrollTop / rowHeight);

  // 防止滚动到底部时抖动
  const newStartIndex = Math.max(0, startIndex - 10); // 额外缓冲10行
  const maxStartIndex = Math.max(0, filteredData.value.length - VISIBLE_ITEMS_COUNT);

  // 不要超出数据范围
  visibleDataStartIndex.value = Math.min(newStartIndex, maxStartIndex);
};

// 生成行的唯一ID
const generateRowId = (rowData) => {
  return rowData.uid || `${rowData.index}_${rowData.url}_${rowData.create_time}`;
};

// 行点击处理
const handleRowClick = (e) => {
  if (e.rowData) {
    console.log(e.rowData)
    selectedRowData.value = e.rowData;
    selectedRowId.value = generateRowId(e.rowData);
  }

};

// 获取行样式类
const getRowClass = ({ rowData }) => {
  if (!rowData) return '';
  const classes = [];

  // 选中行高亮
  if (selectedRowId.value && generateRowId(rowData) === selectedRowId.value) {
    classes.push('selected-row');
  }

  // 基于状态码添加样式
  const statusCode = Number(rowData.response_status);
  if (statusCode >= 400) {
    classes.push('error-row');
  } else if (statusCode >= 300) {
    classes.push('redirect-row');
  }

  return classes.join(' ');
};

// 滚动到顶部
const scrollToTop = () => {
  // 使用多种方法尝试获取滚动容器
  let scrollContainer = null;

  // 方法1：从组件引用获取
  if (tableRef.value?.$el) {
    scrollContainer = tableRef.value.$el.querySelector('.el-scrollbar__wrap');
  }

  // 方法2：直接从DOM获取
  if (!scrollContainer) {
    scrollContainer = document.querySelector('.el-table-v2__main .el-scrollbar__wrap');
  }

  // 方法3：使用更一般的选择器
  if (!scrollContainer) {
    scrollContainer = document.querySelector('.el-scrollbar__wrap');
  }

  if (scrollContainer) {
    // 重置虚拟列表位置
    visibleDataStartIndex.value = 0;

    // 直接设置滚动位置
    scrollContainer.scrollTop = 0;

    // 触发滚动事件以更新视图
    const scrollEvent = new Event('scroll');
    scrollContainer.dispatchEvent(scrollEvent);

    // 强制刷新视图
    nextTick(() => {
      // 再次确认滚动位置
      if (scrollContainer.scrollTop !== 0) {
        scrollContainer.scrollTop = 0;
      }
    });
  } else {
    console.log('未找到表格滚动容器');
  }
};

// 拖动调整宽度相关
// 使用节流函数限制调整频率
const throttle = (fn, delay) => {
  let lastCall = 0;
  let frameId = null;

  return function (...args) {
    const now = Date.now();
    if (now - lastCall < delay) {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        lastCall = now;
        fn.apply(this, args);
      });
    } else {
      lastCall = now;
      fn.apply(this, args);
    }
  };
};

// 存储调整前的元素样式，用于优化性能
let initialContainerWidth = 0;
let initialViewDataWidth = 0;
let initialX = 0;

const startResize = (e) => {
  e.preventDefault();

  // 记录初始值，避免在移动过程中重复计算
  initialX = e.clientX;
  initialViewDataWidth = viewDataWidth.value;
  initialContainerWidth = document.querySelector('.table-container').offsetWidth;

  isResizing.value = true;

  // 添加调整时的样式类
  document.body.classList.add('resizing-body');

  document.addEventListener('mousemove', handleMouseMoveThrottled);
  document.addEventListener('mouseup', handleMouseUp);
};

// 实际调整宽度的函数
const performResize = (e) => {
  if (!isResizing.value) return;

  // 计算鼠标移动的距离
  const deltaX = initialX - e.clientX;

  // 计算新宽度，限制最小宽度为250px，最大宽度为窗口宽度的70%
  const maxWidth = window.innerWidth * 0.7;
  const newWidth = Math.max(250, Math.min(maxWidth, initialViewDataWidth + deltaX));

  // 使用transform而不是直接修改宽度，提高性能
  if (newWidth !== viewDataWidth.value) {
    viewDataWidth.value = newWidth;
  }
};

// 使用节流版本的移动处理函数
const handleMouseMoveThrottled = throttle(performResize, 16); // 约60fps

const handleMouseUp = () => {
  isResizing.value = false;
  document.body.classList.remove('resizing-body');
  document.removeEventListener('mousemove', handleMouseMoveThrottled);
  document.removeEventListener('mouseup', handleMouseUp);
};

// 数据处理
let index = 0;
const pendingUpdates = [];
let updateTimer = null;

// 批量处理数据更新
const processBatchUpdates = () => {
  if (pendingUpdates.length === 0) return;

  // 批量处理所有待更新数据
  const updates = [...pendingUpdates];
  pendingUpdates.length = 0;

  // 保存当前滚动位置
  const currentScrollPos = scrollPosition.value;
  const wasAtTop = currentScrollPos < 50;

  // 使用requestAnimationFrame确保在下一帧渲染前更新数据
  requestAnimationFrame(() => {
    const updatedIndexes = new Set();
    let bulkUpdate = false;

    // 如果更新量大于5条，临时暂停滚动响应
    if (updates.length > 5) {
      bulkUpdate = true;
    }

    updates.forEach(processedData => {
      if (processedData.uid !== undefined) {
        // 更新已存在的数据
        const existingIndex = dataStore.findIndex(item => item.uid === processedData.uid);
        if (existingIndex !== -1) {
          // 合并 request 和 response 数据
          dataStore[existingIndex] = {
            ...dataStore[existingIndex],
            ...processedData
          };

          updatedIndexes.add(existingIndex);
        } else {
          // 插入新数据
          index++;
          processedData.index = index;
          // 使用unshift是为了让新数据显示在顶部
          dataStore.unshift(processedData);
        }
      } else {
        // 插入新数据
        index++;
        processedData.index = index;
        dataStore.unshift(processedData);
      }
    });

    // 如果数据超过最大限制，移除最旧的数据
    if (dataStore.length > MAX_DATA_LENGTH) {
      dataStore.splice(MAX_DATA_LENGTH);
    }

    // 如果当前有选中的行，检查它是否被更新了
    if (selectedRowId.value) {
      const selectedRow = dataStore.find(item => generateRowId(item) === selectedRowId.value);
      if (selectedRow) {
        selectedRowData.value = selectedRow;
      }
    }

    // 如果原来在顶部，数据更新后保持在顶部
    if (wasAtTop) {
      nextTick(() => {
        // 使用多种方法尝试获取滚动容器
        let scrollContainer = null;

        // 方法1：从组件引用获取
        if (tableRef.value?.$el) {
          scrollContainer = tableRef.value.$el.querySelector('.el-scrollbar__wrap');
        }

        // 方法2：直接从DOM获取
        if (!scrollContainer) {
          scrollContainer = document.querySelector('.el-table-v2__main .el-scrollbar__wrap');
        }

        // 方法3：使用更一般的选择器
        if (!scrollContainer) {
          scrollContainer = document.querySelector('.el-scrollbar__wrap');
        }

        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
          visibleDataStartIndex.value = 0;
        }
      });
    }
  });
};

emitter.on('setFalg', (rowId) => {
  if (!selectedRowId.value) {
    ElMessage.error('请先选择一条数据')
    return
  }
  const host = selectedRowData.value.host
  console.log(host)
  chrome?.webview.postMessage({ type: "setFalg", data: { host } })
})
// 监听事件总线清除事件
emitter.on('clear', clearData);

// 随时响应获取选中行数据
emitter.on('getSelectRow', () => {
  emitter.emit('getSelectRow', selectedRowData.value)
})

// 组件挂载
onMounted(() => {
  // 监听webview消息
  chrome?.webview?.addEventListener('message', (event) => {
    const { data: e } = event;
    console.log('message', e)
    switch (e._message_type_) {
      case 'http':
        // 处理接收到的数据
        e.httpStatus = httpStatus[e.httpStatus_code];
        const processedData = {
          ...e,
          res_type: e.reponse_content_type?.split(';')[0] || ''
        };

        // 将数据添加到待处理队列
        pendingUpdates.push(processedData);

        // 使用防抖处理，避免频繁更新DOM
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
          processBatchUpdates();
          updateTimer = null;
        }, 100); // 100ms的防抖时间
        break;
      case 'switchPlay':
        emitter.emit('switchPlay', e.switchPlay)
        break;
      case 'error_start':
        emitter.emit('switchPlay', 'n')
        ElMessage.error(e.error_message)
        break
      case 'interceptListShow':
        emitter.emit('interceptListShow', e.list)
        break
      default:
        break;
    }

  });



  // 初始化窗口高度
  windowsHeight.value = document.documentElement.clientHeight;

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    windowsHeight.value = document.documentElement.clientHeight;
  });
});

// 组件卸载
onUnmounted(() => {
  // 清理定时器
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }

  // 移除事件监听
  window.removeEventListener('resize', () => { });
  emitter.off('clear', clearData);
});

// 监听过滤条件变化
watch([filterText, filterMethod, filterStatus, filterType], debouncedFilter);
</script>
<style lang="scss" scoped>
.index-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background-secondary);
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-background-primary);
  height: 48px;

  .el-input {
    width: 350px;
  }

  .el-select {
    width: 130px;
  }

  .clear-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .data-stats {
    margin-left: auto;
    font-size: 13px;
    color: var(--color-text-secondary);
  }
}

.index-container-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.table-container {
  height: 100%;
  overflow: hidden;
}

.empty-list-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--color-text-tertiary);
  text-align: center;

  .empty-state-icon {
    width: 32px;
    height: 32px;
    opacity: 0.5;
    margin-bottom: var(--spacing-lg);
  }

  p {
    font-size: 16px;
    color: var(--color-text-secondary);
  }

  .sub-text {
    font-size: 13px;
    color: var(--color-text-tertiary);
    margin-top: var(--spacing-sm);
  }
}

.resizer {
  width: 5px;
  background-color: transparent;
  cursor: col-resize;
  z-index: 10;
  user-select: none;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: '';
    width: 1px;
    height: 100%;
    background-color: var(--color-border);
    transition: var(--transition-fast);
  }

  &:hover::before,
  &.resizing::before {
    background-color: var(--color-accent);
    width: 2px;
  }
}

.scroll-to-top {
  position: fixed;
  bottom: 30px;
  right: calc(var(--spacing-lg) + 450px);
  /* Adjust based on viewDataWidth */
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  z-index: 1000;
  transition: var(--transition-normal);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    background-color: var(--color-background-secondary);
  }

  .bi {
    font-size: 20px;
    color: var(--color-text-secondary);
  }
}
</style>

<style lang="scss">
/* Element Plus Overrides */
.filter-bar {

  .el-input__wrapper,
  .el-select__wrapper {
    border-radius: var(--border-radius-md) !important;
    box-shadow: none !important;
    background-color: var(--color-background-secondary);
    transition: var(--transition-normal);

    &:hover {
      border-color: var(--color-border-hover);
    }

    &.is-focus {
      border-color: var(--color-accent) !important;
    }
  }

  .el-input-group__append {
    background-color: var(--color-background-secondary);
    box-shadow: none !important;

    .el-select .el-input__wrapper {
      border-top-left-radius: 0 !important;
      border-bottom-left-radius: 0 !important;
      border-left: 0;
    }
  }
}

/* Table Styles */
.table-header {
  background-color: var(--color-background-primary) !important;
  border-bottom: 1px solid var(--color-border);

  .el-table-v2__header-cell {
    color: var(--color-text-secondary);
    font-weight: 500;
    font-size: 13px;
  }
}

.el-table-v2__row {
  cursor: pointer;
  transition: background-color 0.15s ease-in-out, transform 0.15s ease-in-out;
  border-bottom: 1px solid var(--color-border) !important;

  &:hover {
    background-color: var(--color-background-hover) !important;
    transform: translateX(4px);
  }

  &.selected-row {
    background-color: var(--color-accent-light) !important;

    .url-text,
    .res-type,
    .el-table-v2__cell-text {
      color: var(--color-accent) !important;
      font-weight: 500;
    }
  }

  &.error-row .status,
  &.error-row .url-text {
    color: var(--color-danger);
  }
}

.el-table-v2__cell {
  padding: 0 var(--spacing-md);
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap !important;
  color: var(--color-text-primary);
}

.url-text {
  font-family: var(--font-family-mono);
  font-size: 13px;
}

.method {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: var(--border-radius-md);
  color: #fff;
  font-weight: 600;
  text-align: center;
  min-width: 50px;
  user-select: none;

  &.GET {
    background-color: var(--color-green);
  }

  &.POST {
    background-color: var(--color-blue);
  }

  &.PUT {
    background-color: var(--color-orange);
  }

  &.DELETE {
    background-color: var(--color-red);
  }

  &.PATCH {
    background-color: var(--color-purple);
  }
}

.status {
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-family-mono);

  &.status-200,
  &.status-201,
  &.status-204 {
    color: var(--color-success);
  }

  &.status-304,
  &.status-400,
  &.status-404,
  &.status-401,
  &.status-403 {
    color: var(--color-warning);
  }

  &.status-500,
  &.status-502,
  &.status-503,
  &.status-504 {
    color: var(--color-danger);
  }
}

/* Add styles for flagged URLs */
.flag-red {
  color: #e31a1a !important;
  font-weight: bold;
}

.flag-orange {
  color: #e65c00 !important;
  font-weight: bold;
}

.flag-yellow {
  color: #cc9900 !important;
  font-weight: bold;
}

.flag-lightgreen {
  color: #2e8b57 !important;
  font-weight: bold;
}

.flag-cyan {
  color: #008b8b !important;
  font-weight: bold;
}

.flag-blue {
  color: #0066cc !important;
  font-weight: bold;
}

.flag-magenta {
  color: #9400d3 !important;
  font-weight: bold;
}

.flag-pink {
  color: #d81b60 !important;
  font-weight: bold;
}

.flag-skyblue {
  color: #0077b6 !important;
  font-weight: bold;
}

.flag-lightblue {
  color: #0077b3 !important;
  font-weight: bold;
}
</style>