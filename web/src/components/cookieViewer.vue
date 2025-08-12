<template>
  <div class="cookie-container">
    <div class="panel-header">
      <span class="panel-title">原始Cookie</span>
      <div class="action-buttons">
        <el-button type="primary" size="small" @click="copyContent(cookieString)" class="copy-btn">
          <i class="bi bi-clipboard"></i> 复制
        </el-button>
      </div>
    </div>

    <div class="header-container">
      <pre class="language-http" v-html="formattedCookieString"></pre>
    </div>

    <div class="cookie-items-container">
      <div class="panel-header">
        <span class="panel-title">Cookie详情</span>
      </div>

      <el-empty v-if="!parsedCookies.length" description="无Cookie数据" :image-size="60" class="empty-cookies" />

      <!-- 使用表格展示Cookie列表 -->
      <div v-else class="cookie-table-view">
        <el-table :data="parsedCookies" style="width: 100%" size="small" border stripe>
          <el-table-column prop="name" label="名称" min-width="200">
            <template #default="scope">
              <div class="cookie-name">{{ scope.row.name }}</div>
            </template>
          </el-table-column>

          <el-table-column label="值" min-width="300">
            <template #default="scope">
              <div class="cookie-value-cell">
                <div class="value-content">{{ scope.row.value }}</div>
                <el-button type="primary" size="small" link @click.stop="copyContent(scope.row.value)" class="copy-btn">
                  <i class="bi bi-clipboard"></i>
                </el-button>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="属性" min-width="200">
            <template #default="scope">
              <div class="attributes-container" v-if="scope.row.attributes">
                <el-tag v-for="(value, name) in scope.row.attributes" :key="name" size="small"
                  :type="getAttributeTagType(name)" class="attribute-tag">
                  {{ name }}{{ value !== true ? '=' + value : '' }}
                </el-tag>
              </div>
              <span v-else class="no-attributes">无属性</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import hljs from 'highlight.js/lib/core';
import langHttp from 'highlight.js/lib/languages/http';

// 注册HTTP语法高亮
hljs.registerLanguage('http', langHttp);

export default {
  props: {
    cookieString: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    // 存储解析后的Cookie
    const parsedCookies = ref([]);

    // 格式化的Cookie字符串（带高亮）
    const formattedCookieString = computed(() => {
      if (!props.cookieString) return '';

      try {
        return hljs.highlight(props.cookieString, { language: 'http' }).value;
      } catch (e) {
        return props.cookieString;
      }
    });

    // 解析Cookie字符串为结构化数据
    const parseCookies = (cookieStr) => {
      if (!cookieStr) {
        parsedCookies.value = [];
        return;
      }

      const cookies = [];

      // 支持多种格式的Cookie字符串
      // 1. HTTP响应头中的多个Set-Cookie行
      // 2. 请求头中的单个Cookie行，包含多个name=value对
      const cookieLines = cookieStr.split('\n')
        .map(line => line.trim())
        .filter(line => line && (line.startsWith('Set-Cookie:') || line.startsWith('Cookie:') || line.includes('=')));

      cookieLines.forEach(line => {
        // 移除可能的"Set-Cookie:"或"Cookie:"前缀
        let cookieContent = line;
        if (line.startsWith('Set-Cookie:')) {
          cookieContent = line.substring('Set-Cookie:'.length).trim();
        } else if (line.startsWith('Cookie:')) {
          cookieContent = line.substring('Cookie:'.length).trim();
        }

        // 处理两种情况:
        // 1. 单个完整Cookie (name=value; attr1=val1; attr2; ...)
        // 2. 多个Cookie在一行 (name1=value1; name2=value2; ...)
        const isSingleCookie = cookieContent.includes('=') &&
          (cookieContent.includes('Expires=') ||
            cookieContent.includes('Max-Age=') ||
            cookieContent.includes('Domain=') ||
            cookieContent.includes('Path=') ||
            cookieContent.includes('Secure') ||
            cookieContent.includes('HttpOnly') ||
            cookieContent.includes('SameSite='));

        if (isSingleCookie) {
          // 这是一个完整的单个Cookie (带属性)
          parseSingleCookie(cookieContent, cookies);
        } else {
          // 这可能是多个简单Cookie
          const cookiePairs = cookieContent.split(';');
          cookiePairs.forEach(pair => {
            const trimmedPair = pair.trim();
            if (trimmedPair) {
              const equalsPos = trimmedPair.indexOf('=');
              if (equalsPos > 0) {
                const name = trimmedPair.substring(0, equalsPos).trim();
                const value = trimmedPair.substring(equalsPos + 1).trim();
                cookies.push({
                  name,
                  value,
                  attributes: null
                });
              }
            }
          });
        }
      });

      parsedCookies.value = cookies;
    };

    // 解析单个完整的Cookie（包含属性）
    const parseSingleCookie = (cookieStr, cookies) => {
      // 使用正则表达式找到第一个分号位置，它不在引号内
      let mainPartEndPos = cookieStr.search(/;\s*(?![^"]*"[^"]*(?:"[^"]*"[^"]*)*$)/);

      // 如果没有找到分号，就使用整个字符串
      if (mainPartEndPos === -1) {
        mainPartEndPos = cookieStr.length;
      }

      const mainPart = cookieStr.substring(0, mainPartEndPos).trim();
      const equalsPos = mainPart.indexOf('=');

      if (equalsPos > 0) {
        const name = mainPart.substring(0, equalsPos).trim();
        const value = mainPart.substring(equalsPos + 1).trim();

        // 提取属性
        const attributes = {};
        if (mainPartEndPos < cookieStr.length) {
          const attributesStr = cookieStr.substring(mainPartEndPos + 1);
          const attrParts = attributesStr.split(/;\s*(?![^"]*"[^"]*(?:"[^"]*"[^"]*)*$)/);

          attrParts.forEach(part => {
            const trimmedPart = part.trim();
            if (trimmedPart) {
              const attrEqPos = trimmedPart.indexOf('=');

              if (attrEqPos > 0) {
                const attrName = trimmedPart.substring(0, attrEqPos).trim();
                let attrValue = trimmedPart.substring(attrEqPos + 1).trim();

                // 移除值两侧的引号（如果有）
                if (attrValue.startsWith('"') && attrValue.endsWith('"')) {
                  attrValue = attrValue.substring(1, attrValue.length - 1);
                }

                attributes[attrName] = attrValue;
              } else {
                // 无值属性如Secure, HttpOnly
                attributes[trimmedPart] = true;
              }
            }
          });
        }

        cookies.push({
          name,
          value,
          attributes: Object.keys(attributes).length > 0 ? attributes : null
        });
      }
    };

    // 根据属性名返回Tag类型
    const getAttributeTagType = (attrName) => {
      const typeMap = {
        'Secure': 'success',
        'HttpOnly': 'warning',
        'SameSite': 'info',
        'Path': '',
        'Domain': 'info',
        'Expires': 'danger',
        'Max-Age': 'danger'
      };

      return typeMap[attrName] || '';
    };

    // 复制内容到剪贴板
    const copyContent = (content) => {
      if (content) {
        navigator.clipboard.writeText(content)
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
      }
    };

    // 监听Cookie字符串变化
    watch(() => props.cookieString, (newCookies) => {
      parseCookies(newCookies);
    }, { immediate: true });

    return {
      parsedCookies,
      formattedCookieString,
      copyContent,
      getAttributeTagType
    };
  }
};
</script>

<style lang="scss" scoped>
.cookie-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-bottom: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(180deg, #f5f7fa 0%, #edf1f7 100%);
  border-bottom: 1px solid #e0e3e9;

  .panel-title {
    font-weight: 600;
    color: #2c3e50;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.header-container {
  max-height: 150px;
  overflow: auto;
  background-color: #f8fafc;
  padding: 10px 16px;
  margin: 0;
  border-bottom: 1px solid #edf2f7;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);

  pre {
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    font-family: 'CascadiaMono', 'Consolas', 'Monaco', monospace;
    line-height: 1.5;
    font-size: 12px;
  }

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.15);
    border-radius: 3px;
  }
}

.cookie-items-container {
  flex: 1;
  overflow: auto;
  margin-top: 0;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.empty-cookies {
  padding: 32px 0;
}

/* 表格样式 */
.cookie-table-view {
  flex: 1;
  padding: 0;
  overflow: auto;

  :deep(.el-table) {
    --el-table-border-color: #ebeef5;
    --el-table-header-bg-color: #f5f7fa;
    --el-table-row-hover-bg-color: #f0f7ff;

    .el-table__header th {
      font-weight: 600;
      color: #5e6d82;
      background: linear-gradient(180deg, #f9fafc 0%, #f5f7fa 100%);
    }

    .el-table__row {
      &.hover-row {
        background-color: #f0f7ff;
      }
    }

    .cell {
      line-height: 1.5;
    }
  }
}

.cookie-name {
  font-weight: 600;
  color: #2c3e50;
  font-family: 'CascadiaMono', 'Consolas', 'Monaco', monospace;
}

.cookie-value-cell {
  display: flex;
  align-items: flex-start;
  gap: 8px;

  .value-content {
    flex: 1;
    word-break: break-all;
    white-space: pre-wrap;
    font-family: 'CascadiaMono', 'Consolas', 'Monaco', monospace;
    background-color: #f9fafc;
    padding: 4px 8px;
    border-radius: 3px;
    max-height: 80px;
    overflow-y: auto;
    font-size: 12px;
    border: 1px solid #edf2f7;
    color: #5e6d82;
  }

  .copy-btn {
    flex-shrink: 0;
    padding: 4px;
  }
}

.attributes-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  .attribute-tag {
    margin-right: 0;
    font-size: 11px;
  }
}

.no-attributes {
  color: #c0c4cc;
  font-style: italic;
}

/* 弹出详情样式 */
.cookie-detail-popover {
  h4 {
    margin-top: 0;
    margin-bottom: 12px;
    color: #409eff;
    font-weight: 600;
    padding-bottom: 8px;
    border-bottom: 1px solid #ebeef5;
  }

  .detail-item {
    margin-bottom: 10px;

    .detail-label {
      font-weight: 600;
      color: #5e6d82;
      margin-bottom: 4px;
    }

    .detail-value {
      background-color: #f9fafc;
      padding: 6px 10px;
      border-radius: 4px;
      word-break: break-all;
      white-space: pre-wrap;
      font-family: 'CascadiaMono', 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      color: #5e6d82;
      border: 1px solid #edf2f7;
    }
  }
}

/* 滚动条美化 */
:deep(*::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(*::-webkit-scrollbar-thumb) {
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

:deep(*::-webkit-scrollbar-track) {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>