<template>
  <div class="menu-bar">
    <div class="menu-group">
      <useIcon :alt="isOpen === 'n' ? '开始监听 (F1)' : '停止监听 (F1)'" :icon="isOpen === 'n' ? icon_play : icon_stop"
        :active="isOpen === 'y'" @click="switchPlay" />
      <useIcon :disabled="isOpen === 'n'" alt="清空列表 (F2)" :icon="icon_broom" @click="onClear" />
    </div>

    <div class="menu-group-divider"></div>

    <div class="menu-group">
      <useIcon :disabled="isOpen === 'n'" :alt="isIE === 'y' ? '系统代理已开启' : '开启系统代理'" :icon="icon_ie"
        :active="isIE === 'y'" :showActive="true" @click="switchIE" />
      <useIcon :alt="isPCI === 'y' ? '驱动已安装' : '安装驱动'" :icon="icon_network" :active="isPCI === 'y'" :showActive="true"
        @click="switchPCI" />
    </div>

    <div class="menu-group-divider"></div>

    <div class="menu-group">
      <useIcon :disabled="!selectedRowData.url" :alt="selectedRowData.url_flag === 'y' ? '删除标记' : '标记URL'"
        :icon="selectedRowData.url_flag === 'y' ? icon_delete : icon_flag" :active="selectedRowData.url_flag === 'y'"
        @click="setFlag" />
      <useIcon :disabled="!selectedRowData.url" alt="修改请求/响应" :showActive="true"
        :active="selectedRowData.modify_flag === 'y'" :icon="icon_edit" @click="setEdit" />
    </div>

    <div class="menu-group-divider"></div>

    <div class="menu-group">
      <useIcon alt="拦截列表" :icon="icon_block" @click="setBlock" />
    </div>

    <div class="menu-group-spring"></div>

    <div class="menu-group">
      <useIcon alt="设置" :icon="icon_cog" @click="isSettings = true" />
    </div>


    <settingsWindow v-model="isSettings" />
    <flagURI v-model="isFlagURI" />
    <modifyWindows v-model="isModify" />
    <interceptListWindows v-model="isBlock" />
  </div>
</template>
<script setup>
import useIcon from "@/components/useIcon.vue";
import { ref, inject, onMounted, onUnmounted } from 'vue';
import emitter from '@/utils/emitter'
import flagURI from '@/components/flagURI.vue'
import { ElMessage } from 'element-plus'
import modifyWindows from '@/components/modifyWindows.vue'
import interceptListWindows from '@/components/interceptListWindows.vue'

// Re-importing original icons
import icon_play from '@/assets/images/icon/control-play-blue.png'
import icon_stop from '@/assets/images/icon/control-stop-blue-icon.png'
import icon_broom from '@/assets/images/icon/broom-icon.png'
import icon_ie from '@/assets/images/icon/internet-explorer-icon.png'
import icon_cog from '@/assets/images/icon/cog-icon.png'
import icon_network from '@/assets/images/icon/pci-icon.png' // Using pci-icon as network icon
import icon_flag from '@/assets/images/icon/tag-blue-add-icon.png'
import icon_delete from '@/assets/images/icon/tag-blue-delete-icon.png'
import icon_edit from '@/assets/images/icon/edit-package-icon.png'
import icon_block from '@/assets/images/icon/address-block-icon.png'
import icon_construction from '@/assets/images/icon/construction-icon.png'


const selectedRowData = inject('selectedRowData')

const isOpen = ref('n')
const isIE = ref('n')
const isPCI = ref('n')
const isSettings = ref(false)
const isFlagURI = ref(false)
const isModify = ref(false)
const isBlock = ref(false)

const onClear = () => {
  emitter.emit('clear')
}

emitter.on('switchPlay', (v) => {
  if (v === 'y') {
    ElMessage.success('开启成功')
  }
  isIE.value = v
  isOpen.value = v
})

function switchPlay() {
  isOpen.value = isOpen.value === 'n' ? 'y' : 'n'
  if (isOpen.value === 'y') {
    chrome?.webview.postMessage({ type: "play" })
  } else {
    chrome?.webview.postMessage({ type: "stop" })
  }
}

function switchIE() {
  isIE.value = isIE.value === 'n' ? 'y' : 'n'
  if (isIE.value === 'y') {
    chrome?.webview.postMessage({ type: "open_ie" })
  } else {
    chrome?.webview.postMessage({ type: "close_ie" })
  }

}

function switchPCI() {
  isPCI.value = isPCI.value === 'n' ? 'y' : 'n'
  chrome?.webview.postMessage({ type: "switchPCI", data: { isOpen: isPCI.value } })
}

function setFlag() {
  if (!selectedRowData.value?.url) {
    ElMessage.warning('请先选择一个请求');
    return;
  }
  if (selectedRowData.value.url_flag === 'y') {
    chrome?.webview.postMessage({ type: "deleteFlag", data: { url: selectedRowData.value.url } })
    selectedRowData.value.url_flag = 'n'
    selectedRowData.value.flag_color = ''
    ElMessage.success('删除标记成功')
  } else {
    isFlagURI.value = true
  }
}

function setEdit() {
  if (!selectedRowData.value?.url) {
    ElMessage.warning('请先选择一个请求');
    return;
  }
  isModify.value = true
}

function setBlock() {
  isBlock.value = true
  chrome?.webview.postMessage({ type: "interceptListShow" })
}


// Hotkeys
const handleKeyDown = (e) => {
  if (e.key === 'F1') {
    e.preventDefault();
    switchPlay();
  }
  if (e.key === 'F2') {
    e.preventDefault();
    onClear();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

</script>
<style lang="scss" scoped>
.menu-bar {
  display: flex;
  align-items: center;
  height: var(--header-height);
  padding: 0 var(--spacing-md);
  background-color: var(--color-background-tertiary);
  border-bottom: 1px solid var(--color-border);
  gap: var(--spacing-sm);
}

.menu-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.menu-group-divider {
  width: 1px;
  height: 20px;
  background-color: var(--color-border);
  margin: 0 var(--spacing-sm);
}

.menu-group-spring {
  flex: 1;
}
</style>