<template>
  <n-layout has-sider class="layout">
    <n-layout-sider
      bordered
      :collapsed="collapsed"
      collapse-mode="width"
      :native-scrollbar="false"
      :width="240"
      :collapsed-width="64"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="logo">
        <img src="/favicon.svg" alt="Hermes" class="logo-img" />
        <span v-if="!collapsed" class="logo-text">Hermes</span>
      </div>
      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="currentKey"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>
    <n-layout>
      <n-layout-header bordered class="header">
        <div class="header-left">
          <n-breadcrumb>
            <n-breadcrumb-item>{{ currentRoute?.meta?.title }}</n-breadcrumb-item>
          </n-breadcrumb>
        </div>
        <div class="header-right">
<n-button quaternary circle @click="toggleTheme">
            <template #icon>
              <n-icon><component :is="isDark.value ? SunnyOutline : MoonOutline" /></n-icon>
            </template>
          </n-button>
          <n-dropdown :options="userOptions" @select="handleUserSelect">
            <n-button quaternary>
              <template #icon>
                <n-icon><PersonCircleOutline /></n-icon>
              </template>
              Admin
            </n-button>
          </n-dropdown>
        </div>
      </n-layout-header>
      <n-layout-content class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
  HomeOutline,
  ChatbubblesOutline,
  ListOutline,
  RocketOutline,
  BulbOutline,
  ColorPaletteOutline,
  GitBranchOutline,
  TimeOutline,
  PeopleOutline,
  PulseOutline,
  SettingsOutline,
  PersonCircleOutline,
  SunnyOutline,
  MoonOutline,
  LogOutOutline
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const isDark = inject('isDark', { value: true }) as { value: boolean }

const currentRoute = computed(() => route)
const currentKey = computed(() => route.path.replace('/', '') || 'dashboard')

const menuOptions: MenuOption[] = [
  {
    label: '仪表盘',
    key: 'dashboard',
    icon: () => h(NIcon, null, { default: () => h(HomeOutline) })
  },
  {
    label: '在线对话',
    key: 'chat',
    icon: () => h(NIcon, null, { default: () => h(ChatbubblesOutline) })
  },
  {
    label: '会话管理',
    key: 'sessions',
    icon: () => h(NIcon, null, { default: () => h(ListOutline) })
  },
  {
    type: 'divider',
    key: 'd1'
  },
  {
    label: '技能管理',
    key: 'skills',
    icon: () => h(NIcon, null, { default: () => h(RocketOutline) })
  },
  {
    label: '记忆管理',
    key: 'memory',
    icon: () => h(NIcon, null, { default: () => h(BulbOutline) })
  },
  {
    type: 'divider',
    key: 'd2'
  },
  {
    label: '模型管理',
    key: 'models',
    icon: () => h(NIcon, null, { default: () => h(ColorPaletteOutline) })
  },
  {
    label: '频道管理',
    key: 'channels',
    icon: () => h(NIcon, null, { default: () => h(GitBranchOutline) })
  },
  {
    label: '任务计划',
    key: 'cron',
    icon: () => h(NIcon, null, { default: () => h(TimeOutline) })
  },
  {
    label: '多智能体',
    key: 'agents',
    icon: () => h(NIcon, null, { default: () => h(PeopleOutline) })
  },
  {
    type: 'divider',
    key: 'd3'
  },
  {
    label: '系统监控',
    key: 'system',
    icon: () => h(NIcon, null, { default: () => h(PulseOutline) })
  },
  {
    label: '系统设置',
    key: 'settings',
    icon: () => h(NIcon, null, { default: () => h(SettingsOutline) })
  }
]

const userOptions = [
  { label: '退出登录', key: 'logout', icon: () => h(NIcon, null, { default: () => h(LogOutOutline) }) }
]

const handleMenuSelect = (key: string) => {
  router.push(`/${key}`)
}

const handleUserSelect = (key: string) => {
  if (key === 'logout') {
    router.push('/login')
  }
}

const toggleTheme = () => {
  isDark.value = !isDark.value
}
</script>

<style scoped>
.layout {
  height: 100vh;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  gap: 12px;
}

.logo-img {
  width: 32px;
  height: 32px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #63e6be, #1a7f64);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.content {
  padding: 24px;
  overflow: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>