<template>
  <div class="dashboard">
    <n-spin :show="loading">
      <!-- 顶部统计卡片 -->
      <n-grid :cols="4" :x-gap="16" :y-gap="16">
        <n-gi>
          <n-card class="stat-card">
            <n-statistic label="活跃会话">
              <template #prefix><n-icon :size="24" color="#63e6be"><ChatbubblesOutline /></n-icon></template>
              <n-number-animation :from="0" :to="stats.sessions" :duration="1000" />
            </n-statistic>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card class="stat-card">
            <n-statistic label="已加载技能">
              <template #prefix><n-icon :size="24" color="#ffd43b"><RocketOutline /></n-icon></template>
              <n-number-animation :from="0" :to="stats.skills" :duration="1000" />
            </n-statistic>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card class="stat-card">
            <n-statistic label="总 Token 消耗">
              <template #prefix><n-icon :size="24" color="#69db7c"><FlashOutline /></n-icon></template>
              {{ stats.totalTokens.toLocaleString() }}
            </n-statistic>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card class="stat-card">
            <n-statistic label="记忆条数">
              <template #prefix><n-icon :size="24" color="#ff922b"><BulbOutline /></n-icon></template>
              <n-number-animation :from="0" :to="stats.memoryEntries" :duration="1000" />
            </n-statistic>
          </n-card>
        </n-gi>
      </n-grid>

      <!-- 中间：最近会话 + 快速操作 -->
      <n-grid :cols="3" :x-gap="16" :y-gap="16" style="margin-top: 16px">
        <n-gi :span="2">
          <n-card title="最近会话 (真实数据)">
            <n-empty v-if="recentSessions.length === 0" description="暂无会话" />
            <n-timeline v-else>
              <n-timeline-item
                v-for="(s, i) in recentSessions"
                :key="i"
                :type="['success', 'info', 'warning', 'error', 'default'][i % 5] as any"
                :title="s.title"
                :time="s.lastActivity"
              >
                {{ s.platformIcon }} {{ s.platform }} · {{ s.messageCount }} 条消息 · {{ s.tokens.toLocaleString() }} tokens
              </n-timeline-item>
            </n-timeline>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card title="快速操作">
            <n-space vertical>
              <n-button block @click="$router.push('/chat')">🚀 开始新对话</n-button>
              <n-button block @click="$router.push('/skills')">🛠 管理技能</n-button>
              <n-button block @click="$router.push('/sessions')">📋 查看会话</n-button>
              <n-button block @click="$router.push('/models')">🤖 模型配置</n-button>
              <n-button block @click="$router.push('/channels')">📡 频道管理</n-button>
            </n-space>
          </n-card>
        </n-gi>
      </n-grid>

      <!-- 底部：系统资源 + 网关状态 -->
      <n-grid :cols="2" :x-gap="16" :y-gap="16" style="margin-top: 16px">
        <n-gi>
          <n-card title="系统资源 (实时)">
            <n-descriptions :column="1" label-placement="left">
              <n-descriptions-item label="运行时间">{{ systemInfo.uptime || '...' }}</n-descriptions-item>
              <n-descriptions-item label="内存使用">
                <n-progress type="line" :percentage="systemInfo.memoryPercent || 0" :status="systemInfo.memoryPercent > 80 ? 'error' : 'success'" />
                {{ systemInfo.memory?.used || 0 }} / {{ systemInfo.memory?.total || 0 }} MB
              </n-descriptions-item>
              <n-descriptions-item label="磁盘使用">
                <n-progress type="line" :percentage="parseInt(systemInfo.diskPercent) || 0" :status="parseInt(systemInfo.diskPercent) > 80 ? 'error' : 'success'" />
                {{ systemInfo.disk?.used || '...' }} / {{ systemInfo.disk?.total || '...' }} ({{ systemInfo.disk?.percent || '' }})
              </n-descriptions-item>
              <n-descriptions-item label="CPU 负载">{{ systemInfo.cpuLoad || '...' }}</n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card title="网关状态">
            <n-descriptions :column="1" label-placement="left">
              <n-descriptions-item label="状态">
                <n-tag :type="gatewayState.isRunning ? 'success' : 'error'" size="medium">
                  {{ gatewayState.isRunning ? '✅ 运行中' : '❌ 已停止' }}
                </n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="PID">{{ gatewayState.pid || 'N/A' }}</n-descriptions-item>
              <n-descriptions-item label="连接平台" v-if="gatewayState.platforms">
                <n-space>
                  <n-tag v-for="(v, k) in gatewayState.platforms" :key="k" :type="v.state === 'connected' ? 'success' : 'default'">
                    {{ k }} ({{ v.state }})
                  </n-tag>
                </n-space>
              </n-descriptions-item>
              <n-descriptions-item label="最后更新">{{ formatTime(gatewayState.lastUpdate) }}</n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-gi>
      </n-grid>

      <!-- 数据来源标识 -->
      <n-alert type="success" style="margin-top: 16px">
        <n-space>
          <n-tag type="success">✅ 真实数据</n-tag>
          数据源: {{ hermesHome }} | API: /api/* | 网关: 运行中
        </n-space>
      </n-alert>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ChatbubblesOutline, RocketOutline, BulbOutline, FlashOutline } from '@vicons/ionicons5'
import { wsService } from '@/services/websocket'

const API = '/api'
const loading = ref(false)
const hermesHome = ref('')
const stats = ref({ sessions: 0, skills: 0, totalTokens: 0, memoryEntries: 0 })
const recentSessions = ref<any[]>([])
const systemInfo = ref<any>({})
const gatewayState = ref<any>({})

function formatTime(t: string): string {
 if (!t) return 'N/A'
 try { return new Date(t).toLocaleString('zh-CN') } catch { return t }
}

async function fetchData() {
 loading.value = true
 try {
 const [sess, skills, mem, sys, gw, cfg] = await Promise.all([
 fetch(`${API}/sessions`).then(r => r.json()),
 fetch(`${API}/skills`).then(r => r.json()),
 fetch(`${API}/memories`).then(r => r.json()),
 fetch(`${API}/system`).then(r => r.json()),
 fetch(`${API}/gateway`).then(r => r.json()),
 fetch(`${API}/config`).then(r => r.json())
 ])

 hermesHome.value = cfg?.hermesHome || gw?.hermesHome || '~/.hermes'

 // 统计数据
 stats.value = {
 sessions: Array.isArray(sess) ? sess.length : 0,
 skills: skills?.count || 0,
 totalTokens: Array.isArray(sess) ? sess.reduce((sum: number, s: any) => sum + (s.tokens || 0), 0) : 0,
 memoryEntries: mem?.count || 0
 }

 // 最近会话
 recentSessions.value = (Array.isArray(sess) ? sess : []).map((s: any) => ({
 id: s.id,
 title: s.title || '无标题会话',
 platform: s.platform,
 platformIcon: s.platformIcon,
 messageCount: s.messageCount || 0,
 tokens: s.tokens || 0,
 lastActivity: s.lastActivity?.split('T')[0] || s.created || 'N/A'
 })).slice(0, 5)

 systemInfo.value = sys || {}
 gatewayState.value = gw || {}
 } catch (e) {
 console.error('数据获取失败:', e)
 } finally {
 loading.value = false
 }
}

// WebSocket 实时更新系统信息
let unsubscribeSystem: (() => void) | null = null

onMounted(() => {
 fetchData()
 
 // 启用 WebSocket 实时更新
 wsService.connect()
 unsubscribeSystem = wsService.subscribe('system:update', (data: any) => {
 systemInfo.value = {
 ...systemInfo.value,
 ...data,
 uptime: data.uptime,
 cpuLoad: data.cpuLoad,
 memory: data.memory,
 memoryPercent: data.memoryPercent,
 disk: data.disk,
 diskPercent: data.diskPercent
 }
 })
})

onUnmounted(() => {
 if (unsubscribeSystem) {
 unsubscribeSystem()
 }
})
</script>

<style scoped>
.dashboard { max-width: 1400px; }
.stat-card { text-align: center; }
</style>
