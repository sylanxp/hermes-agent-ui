<template>
  <div class="channels-page">
    <n-card>
      <template #header>
        <div class="card-header">
          <span>频道管理</span>
          <n-button size="small" @click="refresh">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            刷新
          </n-button>
        </div>
      </template>

      <n-spin :show="loading">
        <n-grid :cols="2" :x-gap="16" :y-gap="16">
          <n-gi v-for="channel in channels" :key="channel.id">
            <n-card class="channel-card">
              <div class="channel-header">
                <div class="channel-info">
                  <h3>{{ channel.name }}</h3>
                  <n-tag :type="channel.connected ? 'success' : 'error'" size="small">
                    {{ channel.connected ? '已连接' : '未连接' }}
                  </n-tag>
                </div>
                <n-switch
                  :value="channel.connected"
                  :loading="operatingChannels.has(channel.platform)"
                  @update:value="(v: boolean) => toggleChannel(channel.platform, v)"
                />
              </div>

              <n-divider style="margin: 16px 0" />

              <n-descriptions :column="1" size="small">
                <n-descriptions-item label="平台">{{ channel.platform }}</n-descriptions-item>
                <n-descriptions-item label="类型">{{ channel.type }}</n-descriptions-item>
                <n-descriptions-item label="消息数">{{ channel.messageCount?.toLocaleString() || 0 }}</n-descriptions-item>
                <n-descriptions-item label="最后活动">{{ channel.lastActivity || 'N/A' }}</n-descriptions-item>
              </n-descriptions>

              <template #footer>
                <n-space>
                  <n-button
                    size="small"
                    :type="channel.connected ? 'warning' : 'success'"
                    :loading="operatingChannels.has(channel.platform)"
                    @click="toggleChannel(channel.platform, !channel.connected)"
                  >
                    {{ channel.connected ? '断开' : '连接' }}
                  </n-button>
                </n-space>
              </template>
            </n-card>
          </n-gi>
        </n-grid>
        <n-empty v-if="channels.length === 0 && !loading" description="未检测到频道配置" />
      </n-spin>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'

const message = useMessage()
const loading = ref(false)
const operatingChannels = ref(new Set<string>())

interface Channel {
  id: string
  name: string
  type: string
  platform: string
  threadId?: string
  connected: boolean
  messageCount: number
  lastActivity: string
}

const channels = ref<Channel[]>([])

async function loadChannels() {
  loading.value = true
  try {
    const res = await fetch('/api/channels')
    const data = await res.json()
    if (data.output) {
      channels.value = data
    } else {
      channels.value = []
    }
  } catch (e) {
    message.error('加载频道列表失败')
  } finally {
    loading.value = false
  }
}

async function toggleChannel(platform: string, connect: boolean) {
  operatingChannels.value.add(platform)
  try {
    const endpoint = connect
      ? `/api/channels/${platform}/connect`
      : `/api/channels/${platform}/disconnect`
    const res = await fetch(endpoint, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      message.success(data.message || '操作成功')
    } else {
      message.warning(data.error || '操作失败')
    }
  } catch (e) {
    message.error('操作失败')
  } finally {
    operatingChannels.value.delete(platform)
    setTimeout(loadChannels, 2000)
  }
}

async function refresh() {
  await loadChannels()
}

onMounted(refresh)
</script>

<style scoped>
.channels-page { max-width: 1000px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.channel-card { height: 100%; }
.channel-header { display: flex; align-items: center; justify-content: space-between; }
.channel-info h3 { margin: 0 0 4px 0; font-size: 18px; }
</style>
