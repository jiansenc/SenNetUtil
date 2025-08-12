<template>
  <div class="data-content-container">
    <!-- 图片内容 -->
    <template v-if="isImage">
      <div class="panel-header">
        <span class="panel-title">{{ copyTitle }}</span>
        <div class="action-buttons">
          <el-button type="primary" size="small" @click="copyContent" class="copy-btn">
            <i class="bi bi-clipboard"></i> 复制URL
          </el-button>
        </div>
      </div>
      <div class="image-container">
        <img :src="imageUrl" alt="图片内容" />
      </div>
    </template>

    <!-- JSON 视图 -->
    <template v-else-if="isJson">
      <div class="panel-header">
        <span class="panel-title">{{ copyTitle }}</span>
        <div class="action-buttons">
          <el-button type="primary" size="small" @click="copyJsonContent" class="copy-btn">
            <i class="bi bi-clipboard"></i> 复制
          </el-button>
          <el-button type="success" size="small" @click="toggleJsonView" class="view-btn">
            <i class="bi" :class="isTreeView ? 'bi-code-square' : 'bi-list-nested'"></i>
            {{ isTreeView ? '代码视图' : '折叠视图' }}
          </el-button>
          <el-tag v-if="isLargeContent" type="warning" size="small">大文件</el-tag>
        </div>
      </div>

      <div v-if="isTreeView" class="tree-view-container">
        <vue-json-pretty v-if="parsedJson" :data="parsedJson" :deep="1" :show-length="true" :show-line="true"
          :show-double-quotes="true" :collapsed-on-click-brackets="true" class="json-view" @click="handleJsonClick"
          :path-selectable="(path, data) => true" :show-icon="true" :show-select-controller="false"
          :selectableType="'single'" :virtual="isLargeContent" />
        <div v-else class="json-error">
          <el-alert title="JSON解析错误" type="error" show-icon :closable="false" />
        </div>
      </div>
      <div v-else class="code-view-container">
        <div v-if="isRendering" class="loading-indicator">
          <el-progress type="circle" :percentage="renderProgress" />
          <div>正在渲染大型内容...</div>
        </div>
        <highlightjs v-else language="json" :code="displayedContent" />
      </div>
    </template>

    <!-- 非JSON响应 -->
    <template v-else>
      <div class="panel-header">
        <span class="panel-title">{{ copyTitle }}</span>
        <div class="action-buttons">
          <el-button type="primary" size="small" @click="copyContent" class="copy-btn">
            <i class="bi bi-clipboard"></i> 复制
          </el-button>
          <el-select v-if="showFormatOptions" v-model="selectedFormat" placeholder="格式化方式" size="small"
            style="width: 120px">
            <el-option label="自动" value="auto" />
            <el-option label="文本" value="text" />
            <el-option label="HTML" value="html" />
            <el-option label="XML" value="xml" />
            <el-option label="JavaScript" value="javascript" />
            <el-option label="CSS" value="css" />
          </el-select>
          <el-tag v-if="isLargeContent" type="warning" size="small">大文件</el-tag>
        </div>
      </div>
      <div class="code-view-container">
        <div v-if="isRendering" class="loading-indicator">
          <el-progress type="circle" :percentage="renderProgress" />
          <div>正在渲染大型内容...</div>
        </div>
        <highlightjs v-else :language="codeLanguage" :code="displayedContent" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { debounce } from 'lodash-es';
import hljs from 'highlight.js/lib/core';
import hljsVuePlugin from '@highlightjs/vue-plugin';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import javascript from 'highlight.js/lib/languages/javascript';
import css from 'highlight.js/lib/languages/css';
import plaintext from 'highlight.js/lib/languages/plaintext';

// 注册语言
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml); // HTML使用XML高亮
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('plaintext', plaintext);

// 文本分块处理常量
const CHUNK_SIZE = 100000; // 每块文本的大小
const RENDER_DELAY = 30; // 延迟渲染时间(ms)
const MAX_INITIAL_LENGTH = 500000; // 初始渲染的最大长度

// 注册组件
const highlightjs = hljsVuePlugin.component;

// 组件属性定义
const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  contentType: {
    type: String,
    default: 'text/plain'
  },
  copyTitle: {
    type: String,
    default: '内容'
  }
});

// 组件状态
const isTreeView = ref(false);
const parsedJson = ref(null);
const isLargeContent = ref(false);
const isRendering = ref(false);
const renderProgress = ref(0);
const displayedContent = ref('');
const contentChunks = ref([]);
const currentChunkIndex = ref(0);
const selectedFormat = ref('auto');
const showFormatOptions = ref(false);
const imageUrl = ref('');

// 计算是否是JSON内容
const isJson = computed(() => {
  return props.contentType === 'application/json';
});

// 计算是否是图片内容
const isImage = computed(() => {
  return props.contentType.startsWith('image/');
});

// 根据内容类型和格式选项确定代码高亮语言
const codeLanguage = computed(() => {
  if (selectedFormat.value !== 'auto') {
    return selectedFormat.value;
  }

  const typeMap = {
    'text/html': 'html',
    'text/xml': 'xml',
    'application/xml': 'xml',
    'text/css': 'css',
    'text/javascript': 'javascript',
    'application/javascript': 'javascript',
  };

  // 从contentType提取主要部分
  const mainType = props.contentType.split(';')[0];
  return typeMap[mainType] || 'plaintext';
});

// 检查是否应该显示格式化选项
watch(() => props.contentType, (newType) => {
  const formattableTypes = ['text/html', 'text/xml', 'application/xml', 'text/plain'];
  showFormatOptions.value = formattableTypes.some(type => newType.includes(type));

  // 如果是图片类型，处理图片URL
  if (isImage.value && props.content) {
    handleImageContent();
  }
}, { immediate: true });

// 处理图片内容
const handleImageContent = () => {
  // 如果内容是base64编码
  if (props.content.startsWith('data:')) {
    imageUrl.value = props.content;
  }
  // 如果内容是URL
  else {
    try {
      const url = new URL(props.content);
      imageUrl.value = props.content;
    } catch (e) {
      // 如果不是有效URL，尝试作为相对路径处理
      imageUrl.value = props.content;
    }
  }
};

// 懒加载渲染文本内容
const renderTextInChunks = (text) => {
  if (!text) {
    displayedContent.value = '';
    return;
  }

  isRendering.value = true;
  contentChunks.value = chunkifyText(text);
  currentChunkIndex.value = 0;
  displayedContent.value = '';
  renderProgress.value = 0;

  const renderNextChunk = () => {
    if (currentChunkIndex.value < contentChunks.value.length) {
      const chunk = contentChunks.value[currentChunkIndex.value];
      displayedContent.value += chunk;
      currentChunkIndex.value++;
      renderProgress.value = Math.round((currentChunkIndex.value / contentChunks.value.length) * 100);

      nextTick(() => {
        setTimeout(renderNextChunk, RENDER_DELAY);
      });
    } else {
      isRendering.value = false;
    }
  };

  renderNextChunk();
};

// 将大文本分块
const chunkifyText = (text) => {
  if (!text) return [];
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }
  return chunks;
};

// 处理JSON中的空值
const processJsonValues = (obj) => {
  if (obj === null || obj === undefined) {
    return '';
  }

  if (Array.isArray(obj)) {
    return obj.map(item => processJsonValues(item));
  }

  if (typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = processJsonValues(obj[key]);
    }
    return newObj;
  }

  return obj;
};

// 解析JSON数据
const parseJsonContent = (jsonText) => {
  if (!jsonText) {
    parsedJson.value = null;
    isLargeContent.value = false;
    return;
  }

  try {
    // 对于大型JSON，限制解析和渲染
    if (jsonText.length > MAX_INITIAL_LENGTH) {
      isLargeContent.value = true;
      // 尝试解析部分内容
      try {
        const truncatedText = jsonText.substring(0, MAX_INITIAL_LENGTH);
        const rawJson = JSON.parse(truncatedText);
        // 处理空值
        parsedJson.value = processJsonValues(rawJson);
        // 生成格式化后的文本用于代码视图
        renderTextInChunks(JSON.stringify(parsedJson.value, null, 2) + '\n\n... [内容过大，已截断显示] ...');
      } catch (e) {
        console.error('JSON解析错误:', e);
        parsedJson.value = null;
        renderTextInChunks(jsonText.substring(0, MAX_INITIAL_LENGTH) + '\n\n... [内容过大，已截断显示] ...');
      }
    } else {
      // 小型JSON直接解析
      const rawJson = JSON.parse(jsonText);
      // 处理空值
      parsedJson.value = processJsonValues(rawJson);
      renderTextInChunks(JSON.stringify(parsedJson.value, null, 2));
      isLargeContent.value = false;
    }
  } catch (error) {
    console.error('JSON解析错误:', error);
    parsedJson.value = null;
    renderTextInChunks(jsonText);
  }
};

// JSON树形视图的点击处理
const handleJsonClick = (path, data) => {
  // 可以在这里处理JSON节点的点击事件
};

// 监听内容变化
watch(() => props.content, (newContent) => {
  if (isImage.value) {
    handleImageContent();
  } else if (isJson.value) {
    parseJsonContent(newContent);
  } else {
    // 非JSON内容直接渲染
    renderTextInChunks(newContent);
  }
}, { immediate: true });

// 监听格式切换
watch(selectedFormat, () => {
  if (!isJson.value && !isImage.value) {
    // 重新渲染内容以应用新的高亮语言
    renderTextInChunks(props.content);
  }
});

// 切换JSON视图模式
const toggleJsonView = () => {
  isTreeView.value = !isTreeView.value;
};

// 复制JSON内容
const copyJsonContent = () => {
  copyToClipboard(props.content);
};

// 复制一般内容
const copyContent = () => {
  copyToClipboard(props.content);
};

// 复制到剪贴板通用函数
const copyToClipboard = (text) => {
  if (!text) return;

  navigator.clipboard.writeText(text)
    .then(() => {
      ElMessage({
        message: '复制成功',
        type: 'success',
        duration: 2000
      });
    })
    .catch(err => {
      console.error('复制失败:', err);
      ElMessage({
        message: '复制失败',
        type: 'error',
        duration: 2000
      });
    });
};
</script>

<style lang="scss" scoped>
.data-content-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;

  .panel-title {
    font-weight: 500;
    color: #303133;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.tree-view-container,
.code-view-container {
  flex: 1;
  overflow: auto;
  position: relative;

  :deep(code) {
    font-family: 'CascadiaMono', 'Consolas', monospace !important;
  }
}

.tree-view-container {
  padding: 16px;
  background-color: #fff;

  :deep(.json-view) {
    font-family: 'CascadiaMono', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.code-view-container {
  position: relative;

  :deep(pre) {
    margin: 0;
    padding: 16px;
    background-color: #f8f8f8;
    border-radius: 0;
    font-size: 14px;
    line-height: 1.5;
    height: 100%;
    word-wrap: break-word;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  :deep(code) {
    white-space: pre-wrap !important;
    word-break: break-word !important;
    font-family: 'CascadiaMono', 'Consolas', monospace !important;
  }
}

.image-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.copy-btn,
.view-btn {
  display: flex;
  align-items: center;
  gap: 5px;

  .bi {
    font-size: 14px;
  }
}

.json-error {
  padding: 20px;
}
</style>