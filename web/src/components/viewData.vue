<template>
  <div class="view-data-container">
    <transition name="fade" mode="out-in">
      <!-- Empty State -->
      <div v-if="!props.data || Object.keys(props.data).length === 0" class="empty-state" key="empty">
        <img src="@/assets/images/icon/direction-icon.png" alt="Waiting for requests" class="empty-state-icon" />
        <p class="description">选择一个请求以查看其详细信息</p>
      </div>

      <!-- Error State -->
      <div v-else-if="props.data.reponse_stuats_text && props.data.reponse_stuats_text.includes('-1')"
        class="empty-state error-state" key="error">
        <i class="bi bi-exclamation-triangle icon"></i>
        <p class="description">请求失败</p>
        <p class="details">{{ props.data.reponse_stuats_text }}</p>
      </div>

      <!-- Data View -->
      <div v-else class="view-data-content" key="data">
        <div class="request-summary">
          <div class="url-value" :title="props.data.url">
            <span class="url-method" :class="props.data.methods">{{ props.data.methods }}</span>
            <span class="url-text">{{ props.data.url }}</span>
          </div>
          <div class="status-info">
            <el-tag :type="getStatusTagType(props.data.reponse_stuats_text)" size="small" effect="light" round>
              {{ props.data.reponse_stuats_text }}
            </el-tag>
            <el-tag type="info" size="small" effect="light" round>{{ props.data.res_type }}</el-tag>
            <el-tag type="info" size="small" effect="light" round>{{ props.data.reponse_server_ip }}</el-tag>
          </div>
        </div>

        <el-tabs v-model="activeTab" class="custom-tabs">
          <el-tab-pane label="详细信息" name="details">
            <div class="data-container">
              <el-collapse v-model="activeCollapses">
                <el-collapse-item title="通用" name="general">
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">请求时间</span>
                      <span class="info-value">{{ formatDateTime(props.data.create_time) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">进程ID</span>
                      <span class="info-value">{{ props.data.pid }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">唯一ID</span>
                      <span class="info-value">{{ props.data.uid }}</span>
                    </div>
                  </div>
                </el-collapse-item>
                <el-collapse-item title="请求头" name="request-headers">
                  <div class="header-container">
                    <pre><code class="http hljs" v-html="formatHeaders(props.data.request_head)"></code></pre>
                    <el-button class="copy-btn" size="small" text @click="copyContent($event, props.data.request_head)">
                      <span v-if="copyStatus.reqHead">已复制!</span>
                      <span v-else><i class="bi bi-clipboard"></i> 复制</span>
                    </el-button>
                  </div>
                </el-collapse-item>
                <el-collapse-item title="响应头" name="response-headers">
                  <div class="header-container">
                    <pre><code class="http hljs" v-html="formatHeaders(props.data.reponse_head)"></code></pre>
                    <el-button class="copy-btn" size="small" text
                      @click="copyContent($event, props.data.reponse_head, 'resHead')">
                      <span v-if="copyStatus.resHead">已复制!</span>
                      <span v-else><i class="bi bi-clipboard"></i> 复制</span>
                    </el-button>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-tab-pane>

          <el-tab-pane label="请求体" name="request-body">
            <data-content :content="props.data.request_text" :content-type="getRequestContentType()"
              :copy-title="'请求体'" />
          </el-tab-pane>

          <el-tab-pane label="响应体" name="response-body">
            <data-content :content="isImageResponse ? props.data.url : props.data.reponse_text"
              :content-type="props.data.res_type" :copy-title="'响应体'" />
          </el-tab-pane>

          <el-tab-pane label="Cookies" name="cookies">
            <cookie-viewer :cookie-string="props.data.request_cookies" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, computed, reactive, defineProps, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import langHttp from 'highlight.js/lib/languages/http';
import DataContent from './dataContent.vue';
import CookieViewer from './cookieViewer.vue';

// 注册代码高亮语言
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('http', langHttp);

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
});

const activeTab = ref('details');
const activeCollapses = ref(['general', 'request-headers', 'response-headers']);

const copyStatus = reactive({
  reqHead: false,
  resHead: false,
});

// 判断是否为图片响应
const isImageResponse = computed(() => {
  return props.data && props.data.res_type && props.data.res_type.startsWith('image/');
});

const getStatusTagType = (status) => {
  if (!status) return 'info';
  const code = parseInt(status.split(' ')[0]);

  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'warning';
  if (code >= 400 && code < 500) return 'danger';
  if (code >= 500) return 'error';
  return 'info';
};

const formatDateTime = (dateTime) => {
  if (!dateTime) return '';
  try {
    const date = new Date(dateTime);
    return date.toLocaleString();
  } catch (e) {
    return dateTime;
  }
};

// 判断请求体内容类型
const getRequestContentType = () => {
  // 尝试确定请求内容类型
  if (!props.data.request_text) return 'text/plain';

  if (props.data.request_text.trim().startsWith('{') && props.data.request_text.trim().endsWith('}')) {
    try {
      JSON.parse(props.data.request_text);
      return 'application/json';
    } catch (e) {
      // 解析失败，不是有效JSON
    }
  }

  // 尝试检测URL编码格式
  if (props.data.request_text.includes('=') && props.data.request_text.includes('&')) {
    return 'application/x-www-form-urlencoded';
  }

  return 'text/plain';
};

function formatHeaders(headerString) {
  if (!headerString) return '';
  try {
    return hljs.highlight(headerString, { language: 'http', ignoreIllegals: true }).value;
  } catch (e) {
    console.error("Header highlighting failed:", e);
    // Fallback to plain text, ensuring it's properly escaped to be displayed in HTML
    return headerString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

function copyContent(event, content, type) {
  if (content) {
    navigator.clipboard.writeText(content)
      .then(() => {
        if (type) {
          copyStatus[type] = true;
          setTimeout(() => {
            copyStatus[type] = false;
          }, 2000);
        } else {
          ElMessage.success('复制成功');
        }
      })
      .catch(err => {
        console.error('复制失败:', err);
        ElMessage.error('复制失败');
      });
  }
}

// 处理标签页点击，确保内容有时间渲染
const handleTabClick = () => {
  // 使用requestAnimationFrame确保DOM已更新再执行操作
  requestAnimationFrame(() => {
    // 这里可以添加标签切换后的特定逻辑
  });
};
</script>

<style lang="scss" scoped>
.view-data-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-background-secondary);
  border-left: 1px solid var(--color-border);
  font-size: 13px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--color-text-tertiary);
  text-align: center;

  .icon {
    font-size: 48px;
    margin-bottom: var(--spacing-lg);
  }

  .description {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  &.error-state {
    .icon {
      color: var(--color-danger);
    }
  }
}

.view-data-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.request-summary {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-background-primary);
}

.url-value {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.url-method {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  color: #fff;
  font-weight: bold;
  font-size: 11px;
  text-transform: uppercase;

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

.url-text {
  font-family: var(--font-family-mono);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-info {
  display: flex;
  gap: var(--spacing-sm);
}

.custom-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.el-tabs__header) {
    margin: 0;
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: var(--color-background-primary);
    border-bottom: 1px solid var(--color-border);
  }

  :deep(.el-tabs__nav-wrap)::after {
    display: none;
  }

  :deep(.el-tabs__nav) {
    border: none;
    background-color: var(--color-background-tertiary);
    border-radius: var(--border-radius-md);
    padding: 3px;
    display: inline-flex;
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
    padding: 0 var(--spacing-md);

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
    overflow: auto;
    padding: 0;
  }
}

.data-container {
  padding: var(--spacing-md);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-sm);
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin-bottom: var(--spacing-xs);
}

.info-value {
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  font-size: 13px;
  word-break: break-all;
}

.header-container {
  position: relative;
  background-color: var(--color-background-tertiary);
  border-radius: var(--border-radius-md);
  font-size: 13px;
  border: 1px solid var(--color-border);
  overflow: hidden;

  pre {
    padding: var(--spacing-md);
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    font-family: var(--font-family-mono);
    line-height: 1.6;
    background-color: transparent;
  }

  .copy-btn {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    opacity: 0.6;
    transition: var(--transition-fast);

    &:hover {
      opacity: 1;
    }
  }
}

:deep(.el-collapse) {
  border: none;

  .el-collapse-item__header {
    height: 36px;
    line-height: 36px;
    font-size: 14px;
    font-weight: 600;
    padding: 0;
    background-color: transparent;
    border-bottom: none;
    color: var(--color-text-primary);
  }

  .el-collapse-item__content {
    padding-bottom: var(--spacing-lg);
  }

  .el-collapse-item__wrap {
    border-bottom: none;
  }
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
