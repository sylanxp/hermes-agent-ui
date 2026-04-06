<template>
  <div class="channels-page">
    <n-card>
      <template #header>
        <div class="card-header">
          <span>频道管理</span>
          <n-button type="primary" @click="showAddModal = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            添加频道
          </n-button>
        </div>
      </template>

      <n-grid :cols="2" :x-gap="16" :y-gap="16">
        <n-gi v-for="channel in channels" :key="channel.id">
          <n-card class="channel-card">
            <div class="channel-header">
              <div class="channel-icon">
                <n-icon :size="32" :color="channel.color">
                  <component :is="channel.icon" />
                </n-icon>
              </div>
              <div class="channel-info">
                <h3>{{ channel.name }}</h3>
                <n-tag :type="channel.connected ? 'success' : 'error'" size="small">
                  {{ channel.connected ? '已连接' : '未连接' }}
                </n-tag>
              </div>
              <n-switch v-model:value="channel.enabled" />
            </div>
            
            <n-divider style="margin: 16px 0" />
            
            <n-descriptions :column="1" size="small">
              <n-descriptions-item label="频道ID">{{ channel.id }}</n-descriptions-item>
              <n-descriptions-item label="消息数">{{ channel.messageCount.toLocaleString() }}</n-descriptions-item>
              <n-descriptions-item label="最后活动">{{ channel.lastActivity }}</n-descriptions-item>
            </n-descriptions>

            <template #footer>
              <n-space>
                <n-button size="small" @click="configChannel(channel)">
                  <template #icon><n-icon><SettingsOutline /></n-icon></template>
                  配置
                </n-button>
                <n-button size="small" :type="channel.connected ? 'warning' : 'success'" @click="toggleConnection(channel)">
                  {{ channel.connected ? '断开' : '连接' }}
                </n-button>
              </n-space>
            </template>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- 添加频道模态框 -->
    <n-modal v-model:show="showAddModal" preset="card" title="添加频道" style="width: 500px">
      <n-form :model="channelForm" label-placement="left" label-width="80">
        <n-form-item label="频道类型">
          <n-select v-model:value="channelForm.type" :options="channelTypeOptions" />
        </n-form-item>
        <n-form-item label="名称">
          <n-input v-model:value="channelForm.name" placeholder="频道名称" />
        </n-form-item>
        <n-form-item label="Token/Key">
          <n-input v-model:value="channelForm.token" type="password" show-password-on="click" placeholder="凭证" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAddModal = false">取消</n-button>
          <n-button type="primary" @click="saveChannel">添加</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 频道配置抽屉 -->
    <n-drawer v-model:show="showConfigDrawer" :width="400" placement="right">
      <n-drawer-content title="频道配置" closable>
        <n-form :model="configForm" label-placement="left" label-width="100">
          <n-form-item label="频道名称">
            <n-input v-model:value="configForm.name" />
          </n-form-item>
          <n-form-item label="Bot Token">
            <n-input v-model:value="configForm.token" type="password" show-password-on="click" />
          </n-form-item>
          <n-form-item label="Webhook">
            <n-input v-model:value="configForm.webhook" disabled />
          </n-form-item>
          <n-form-item label="自动重连">
            <n-switch v-model:value="configForm.autoReconnect" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-button type="primary" @click="saveConfig">保存配置</n-button>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { 
  AddOutline, 
  SettingsOutline,
  LogoTelegram,
  ChatbubblesOutline,
  PersonOutline,
  LogoWechat
} from '@vicons/ionicons5'

const message = useMessage()
const showAddModal = ref(false)
const showConfigDrawer = ref(false)

const channels = ref([
  { id: 'tg-001', name: 'Telegram Bot', type: 'telegram', icon: LogoTelegram, color: '#26A5E4', connected: true, enabled: true, messageCount: 15420, lastActivity: '刚刚' },
  { id: 'fs-001', name: '飞书机器人', type: 'feishu', icon: ChatbubblesOutline, color: '#00D6B9', connected: true, enabled: true, messageCount: 8932, lastActivity: '5分钟前' },
  { id: 'dt-001', name: '钉钉机器人', type: 'dingtalk', icon: PersonOutline, color: '#0089FF', connected: false, enabled: false, messageCount: 2341, lastActivity: '昨天' },
  { id: 'wx-001', name: '企业微信', type: 'wecom', icon: LogoWechat, color: '#07C160', connected: false, enabled: false, messageCount: 0, lastActivity: '从未' }
])

const channelForm = ref({
  type: 'telegram',
  name: '',
  token: ''
})

const configForm = ref({
  name: '',
  token: '',
  webhook: 'https://api.hermes.ai/webhook/tg-001',
  autoReconnect: true
})

const channelTypeOptions = [
  { label: 'Telegram', value: 'telegram' },
  { label: '飞书', value: 'feishu' },
  { label: '钉钉', value: 'dingtalk' },
  { label: '企业微信', value: 'wecom' },
  { label: 'Discord', value: 'discord' }
]

const configChannel = (channel: any) => {
  configForm.value = {
    name: channel.name,
    token: '••••••••••',
    webhook: `https://api.hermes.ai/webhook/${channel.id}`,
    autoReconnect: true
  }
  showConfigDrawer.value = true
}

const toggleConnection = (channel: any) => {
  if (channel.connected) {
    channel.connected = false
    message.warning(`${channel.name} 已断开`)
  } else {
    message.loading(`正在连接 ${channel.name}...`)
    setTimeout(() => {
      channel.connected = true
      message.success(`${channel.name} 连接成功`)
    }, 1000)
  }
}

const saveChannel = () => {
  message.success('频道添加成功')
  showAddModal.value = false
}

const saveConfig = () => {
  message.success('配置已保存')
  showConfigDrawer.value = false
}
</script>

<style scoped>
.channels-page {
  max-width: 1000px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.channel-card {
  height: 100%;
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.channel-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
}
</style>