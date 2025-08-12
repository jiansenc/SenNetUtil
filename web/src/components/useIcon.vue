<template>
  <div class="toolbar-button" :class="{ 'is-active': active, 'is-disabled': disabled }">
    <el-tooltip :show-after="500" class="box-item" effect="dark" :content="alt" placement="bottom">
      <div class="button-content">
        <img :src="icon" :alt="alt" class="icon-img">
        <img v-if="showActive && active" class="active-indicator" src="@/assets/images/icon/bullet-valid-icon.png"
          alt="">
      </div>
    </el-tooltip>
  </div>
</template>

<script setup>
import icon_active from '@/assets/images/icon/bullet-valid-icon.png'
defineProps({
  icon: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false
  },
  alt: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: false
  },
  showActive: {
    type: Boolean,
    default: false
  }
});
</script>

<style lang="scss" scoped>
.toolbar-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  width: 36px;
  padding: 0;
  border-radius: var(--border-radius-md);
  background-color: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: var(--transition-normal);

  .button-content {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-img {
    transition: var(--transition-fast);
  }

  &:hover {
    background-color: var(--color-background-hover);
    border-color: var(--color-border);
  }

  &.is-active {
    background-color: var(--color-accent-light);
  }

  .active-indicator {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;

    img {
      filter: grayscale(100%);
    }
  }
}
</style>