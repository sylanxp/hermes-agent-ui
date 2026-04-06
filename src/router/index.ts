import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '仪表盘', icon: 'home-outline' }
      },
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('@/views/chat/ChatPage.vue'),
        meta: { title: '在线对话', icon: 'chatbubbles-outline' }
      },
      {
        path: 'sessions',
        name: 'Sessions',
        component: () => import('@/views/sessions/SessionsPage.vue'),
        meta: { title: '会话管理', icon: 'list-outline' }
      },
      {
        path: 'skills',
        name: 'Skills',
        component: () => import('@/views/skills/SkillsPage.vue'),
        meta: { title: '技能管理', icon: 'rocket-outline' }
      },
      {
        path: 'memory',
        name: 'Memory',
        component: () => import('@/views/memory/MemoryPage.vue'),
        meta: { title: '记忆管理', icon: 'brain-outline' }
      },
      {
        path: 'models',
        name: 'Models',
        component: () => import('@/views/models/ModelsPage.vue'),
        meta: { title: '模型管理', icon: 'color-palette-outline' }
      },
      {
        path: 'channels',
        name: 'Channels',
        component: () => import('@/views/channels/ChannelsPage.vue'),
        meta: { title: '频道管理', icon: 'git-branch-outline' }
      },
      {
        path: 'cron',
        name: 'Cron',
        component: () => import('@/views/cron/CronPage.vue'),
        meta: { title: '任务计划', icon: 'time-outline' }
      },
 {
 path: 'agents',
 name: 'Agents',
 component: () => import('@/views/agents/AgentsPage.vue'),
 meta: { title: '多智能体', icon: 'people-outline' }
 },
 {
 path: 'terminal',
 name: 'Terminal',
 component: () => import('@/views/terminal/TerminalPage.vue'),
 meta: { title: '终端', icon: 'terminal-outline' }
 },
 {
 path: 'files',
 name: 'Files',
 component: () => import('@/views/files/FilesPage.vue'),
 meta: { title: '文件管理', icon: 'folder-outline' }
 },
 {
 path: 'system',
 name: 'System',
 component: () => import('@/views/system/SystemPage.vue'),
 meta: { title: '系统监控', icon: 'pulse-outline' }
 },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/SettingsPage.vue'),
        meta: { title: '系统设置', icon: 'settings-outline' }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} | Hermes Dashboard`
  }
  next()
})

export default router