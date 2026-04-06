<template>
  <div class="sessions-page">
    <n-card>
      <template #header>
        <div class="card-header">
          <n-space>
            <n-input v-model:value="searchText" placeholder="搜索会话..." clearable style="width: 200px" />
            <n-select v-model:value="filterPlatform" :options="platformOptions" placeholder="平台" clearable style="width: 120px" />
            <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="状态" clearable style="width: 100px" />
          </n-space>
          <n-space>
            <n-button @click="refreshSessions">
              <template #icon><n-icon><RefreshOutline /></n-icon></template>
              刷新
            </n-button>
            <n-button type="primary" @click="createSession">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              新建会话
            </n-button>
          </n-space>
        </div>
      </template>

      <n-data-table
        :columns="columns"
        :data="filteredSessions"
        :pagination="pagination"
        :bordered="false"
        :row-key="(row: Session) => row.id"
        @update:checked-row-keys="handleCheck"
      />
    </n-card>

    <!-- 会话详情抽屉 -->
    <n-drawer v-model:show="showDetailDrawer" :width="600" placement="right">
      <n-drawer-content title="会话详情" closable>
        <n-descriptions :column="1" label-placement="left" v-if="selectedSession">
          <n-descriptions-item label="会话ID">{{ selectedSession.id }}</n-descriptions-item>
          <n-descriptions-item label="平台">
            <n-tag :type="getPlatformType(selectedSession.platform)">{{ selectedSession.platform }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-tag :type="selectedSession.status === 'active' ? 'success' : 'default'">
              {{ selectedSession.status === 'active' ? '活跃' : '已结束' }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="创建时间">{{ selectedSession.created }}</n-descriptions-item>
          <n-descriptions-item label="最后活动">{{ selectedSession.lastActivity }}</n-descriptions-item>
          <n-descriptions-item label="消息数">{{ selectedSession.messageCount }}</n-descriptions-item>
          <n-descriptions-item label="Token 用量">{{ selectedSession.tokens }}</n-descriptions-item>
        </n-descriptions>
        <n-divider />
        <n-h4>最近消息</n-h4>
        <n-list bordered>
          <n-list-item v-for="msg in sessionMessages" :key="msg.id">
            <n-thing>
              <template #header>
                <n-tag size="small" :type="msg.role === 'user' ? 'info' : 'success'">
                  {{ msg.role === 'user' ? '用户' : 'Hermes' }}
                </n-tag>
              </template>
              {{ msg.content }}
            </n-thing>
          </n-list-item>
        </n-list>
        <template #footer>
          <n-space>
            <n-button @click="openChat">打开对话</n-button>
            <n-button type="warning" @click="resetSession">重置会话</n-button>
            <n-button type="error" @click="deleteSession">删除会话</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { NButton, NSpace, NTag, useMessage, useDialog } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { AddOutline, RefreshOutline } from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()

interface Session {
  id: string
  title: string
  platform: string
  status: 'active' | 'ended'
  created: string
  lastActivity: string
  messageCount: number
  tokens: number
}

const searchText = ref('')
const filterPlatform = ref(null)
const filterStatus = ref(null)
const showDetailDrawer = ref(false)
const selectedSession = ref<Session | null>(null)

const pagination = { pageSize: 10 }
const platformOptions = [
  { label: 'Telegram', value: 'telegram' },
  { label: '飞书', value: 'feishu' },
  { label: '钉钉', value: 'dingtalk' },
  { label: 'Discord', value: 'discord' }
]
const statusOptions = [
  { label: '活跃', value: 'active' },
  { label: '已结束', value: 'ended' }
]

const sessions = ref<Session[]>([
  { id: 's1', title: 'GitHub 项目管理', platform: 'Telegram', status: 'active', created: '2024-01-20 10:30', lastActivity: '刚刚', messageCount: 45, tokens: 12500 },
  { id: 's2', title: '数据分析讨论', platform: '飞书', status: 'active', created: '2024-01-20 09:15', lastActivity: '5分钟前', messageCount: 32, tokens: 8900 },
  { id: 's3', title: '技能开发', platform: 'Discord', status: 'ended', created: '2024-01-19 14:00', lastActivity: '昨天', messageCount: 78, tokens: 23400 },
  { id: 's4', title: '文档整理', platform: '钉钉', status: 'ended', created: '2024-01-18 16:45', lastActivity: '2天前', messageCount: 23, tokens: 6700 }
])

const sessionMessages = ref([
  { id: 1, role: 'user', content: '帮我看看最近的提交' },
  { id: 2, role: 'assistant', content: '好的，正在获取最近 5 次提交...' },
  { id: 3, role: 'user', content: '查看详情' }
])

const filteredSessions = computed(() => {
  let result = sessions.value
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(s => s.title.toLowerCase().includes(search) || s.id.includes(search))
  }
  if (filterPlatform.value) {
    result = result.filter(s => s.platform === filterPlatform.value)
  }
  if (filterStatus.value) {
    result = result.filter(s => s.status === filterStatus.value)
  }
  return result
})

const columns: DataTableColumns<Session> = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 80 },
  { title: '标题', key: 'title', ellipsis: { tooltip: true } },
  { 
    title: '平台', 
    key: 'platform',
    render: (row) => h(NTag, { type: getPlatformType(row.platform), size: 'small' }, { default: () => row.platform })
  },
  { 
    title: '状态', 
    key: 'status',
    render: (row) => h(NTag, { type: row.status === 'active' ? 'success' : 'default', size: 'small' }, { default: () => row.status === 'active' ? '活跃' : '已结束' })
  },
  { title: '消息数', key: 'messageCount', width: 80 },
  { title: 'Token', key: 'tokens', width: 100, render: (row) => row.tokens.toLocaleString() },
  { title: '最后活动', key: 'lastActivity', width: 100 },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => viewDetail(row) }, { default: () => '详情' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => confirmDelete(row) }, { default: () => '删除' })
      ]
    })
  }
]

function getPlatformType(platform: string): 'success' | 'info' | 'warning' | 'error' | 'default' {
  const types: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    'Telegram': 'success',
    '飞书': 'info',
    '钉钉': 'warning',
    'Discord': 'default'
  }
  return types[platform] || 'default'
}

const handleCheck = (keys: Array<string | number>) => {
  console.log('Selected:', keys)
}

const refreshSessions = () => {
  message.success('会话列表已刷新')
}

const createSession = () => {
  message.info('创建新会话')
}

const viewDetail = (row: Session) => {
  selectedSession.value = row
  showDetailDrawer.value = true
}

const openChat = () => {
  message.info('跳转到对话')
}

const resetSession = () => {
  dialog.warning({
    title: '确认重置',
    content: '重置会话将清空所有历史消息，是否继续？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: () => {
      message.success('会话已重置')
      showDetailDrawer.value = false
    }
  })
}

const deleteSession = () => {
  dialog.error({
    title: '确认删除',
    content: '删除后无法恢复，是否继续？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      message.success('会话已删除')
      showDetailDrawer.value = false
    }
  })
}

const confirmDelete = (row: Session) => {
  dialog.error({
    title: '确认删除',
    content: `确定删除会话 "${row.title}" 吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      message.success('删除成功')
    }
  })
}
</script>

<style scoped>
.sessions-page {
  max-width: 1400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>