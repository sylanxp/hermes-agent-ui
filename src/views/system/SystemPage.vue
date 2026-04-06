<template>
  <div class="system-page">
    <n-grid :cols="2" :x-gap="16" :y-gap="16">
      <n-gi>
        <n-card title="系统资源">
          <n-descriptions :column="1" label-placement="left">
            <n-descriptions-item label="运行时间">
              {{ systemInfo.uptime }}
            </n-descriptions-item>
            <n-descriptions-item label="CPU 使用率">
              <n-progress 
                type="line" 
                :percentage="systemInfo.cpu" 
                :status="systemInfo.cpu > 80 ? 'error' : 'success'"
              />
            </n-descriptions-item>
            <n-descriptions-item label="内存使用率">
              <n-progress 
                type="line" 
                :percentage="systemInfo.memory" 
                :status="systemInfo.memory > 80 ? 'error' : 'success'"
              />
            </n-descriptions-item>
            <n-descriptions-item label="磁盘使用率">
              <n-progress 
                type="line" 
                :percentage="systemInfo.disk" 
                :status="systemInfo.disk > 80 ? 'error' : 'success'"
              />
            </n-descriptions-item>
          </n-descriptions>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="应用统计">
          <n-grid :cols="2" :x-gap="12" :y-gap="12">
            <n-gi>
              <n-statistic label="总请求数">
                <n-number-animation :from="0" :to="systemInfo.totalRequests" />
              </n-statistic>
            </n-gi>
            <n-gi>
              <n-statistic label="成功率">
                <n-number-animation :from="0" :to="systemInfo.successRate" :precision="1" />%
              </n-statistic>
            </n-gi>
            <n-gi>
              <n-statistic label="平均响应">
                <n-number-animation :from="0" :to="systemInfo.avgResponse" /> ms
              </n-statistic>
            </n-gi>
            <n-gi>
              <n-statistic label="活跃连接">
                <n-number-animation :from="0" :to="systemInfo.activeConnections" />
              </n-statistic>
            </n-gi>
          </n-grid>
        </n-card>
      </n-gi>
    </n-grid>

    <n-card title="最近日志" style="margin-top: 16px">
      <template #header-extra>
        <n-space>
          <n-select 
            v-model:value="logLevel" 
            :options="logLevelOptions" 
            placeholder="日志级别"
            style="width: 100px"
          />
          <n-button size="small" @click="refreshLogs">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            刷新
          </n-button>
        </n-space>
      </template>
      <div class="log-container">
        <div 
          v-for="(log, index) in filteredLogs" 
          :key="index" 
          :class="['log-entry', log.level]"
        >
          <span class="log-time">{{ log.time }}</span>
          <n-tag size="small" :type="getLogType(log.level)">{{ log.level }}</n-tag>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </n-card>

    <n-grid :cols="2" :x-gap="16" :y-gap="16" style="margin-top: 16px">
      <n-gi>
        <n-card title="已加载技能">
          <n-list bordered size="small">
            <n-list-item v-for="skill in loadedSkills" :key="skill.name">
              <template #prefix>
                <n-icon :color="skill.status === 'ok' ? '#63e6be' : '#ff6b6b'">
                  <component :is="skill.status === 'ok' ? 'CheckmarkCircleOutline' : 'CloseCircleOutline'" />
                </n-icon>
              </template>
              {{ skill.name }}
              <template #suffix>
                <n-tag size="small">{{ skill.category }}</n-tag>
              </template>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="连接状态">
          <n-list bordered size="small">
            <n-list-item v-for="conn in connections" :key="conn.name">
              <template #prefix>
                <n-icon :color="conn.connected ? '#63e6be' : '#ff6b6b'" :size="16">
                  <component :is="conn.connected ? 'LinkOutline' : 'UnlinkOutline'" />
                </n-icon>
              </template>
              {{ conn.name }}
              <template #suffix>
                <n-tag :type="conn.connected ? 'success' : 'error'" size="small">
                  {{ conn.connected ? '已连接' : '未连接' }}
                </n-tag>
              </template>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { RefreshOutline, LinkOutline, UnlinkOutline } from '@vicons/ionicons5'

const message = useMessage()
const logLevel = ref<string | null>(null)

const systemInfo = ref({
  uptime: '15 天 7 小时 23 分钟',
  cpu: 35,
  memory: 58,
  disk: 42,
  totalRequests: 89450,
  successRate: 98.7,
  avgResponse: 456,
  activeConnections: 12
})

const logs = ref([
  { time: '09:45:12', level: 'INFO', message: '技能 github-pr-workflow 加载成功' },
  { time: '09:45:10', level: 'INFO', message: '会话 s-12345 创建成功' },
  { time: '09:44:58', level: 'DEBUG', message: 'API 请求: POST /api/chat' },
  { time: '09:44:55', level: 'WARNING', message: '模型 gpt-4o 响应延迟 2.3s' },
  { time: '09:44:30', level: 'ERROR', message: 'Telegram webhook 重试第 2 次' },
  { time: '09:44:28', level: 'INFO', message: '用户登录成功: admin' }
])

const logLevelOptions = [
  { label: '全部', value: null },
  { label: 'INFO', value: 'INFO' },
  { label: 'DEBUG', value: 'DEBUG' },
  { label: 'WARNING', value: 'WARNING' },
  { label: 'ERROR', value: 'ERROR' }
]

const loadedSkills = ref([
  { name: 'github-pr-workflow', category: 'github', status: 'ok' },
  { name: 'systematic-debugging', category: 'dev', status: 'ok' },
  { name: 'jupyter-live-kernel', category: 'data', status: 'ok' },
  { name: 'unsloth', category: 'mlops', status: 'ok' },
  { name: 'obsidian', category: 'notes', status: 'error' }
])

const connections = ref([
  { name: 'Telegram Bot', connected: true },
  { name: 'Feishu Webhook', connected: true },
  { name: 'Dingtalk Bot', connected: false },
  { name: 'Discord Gateway', connected: false }
])

const filteredLogs = computed(() => {
  if (!logLevel.value) return logs.value
  return logs.value.filter(log => log.level === logLevel.value)
})

const getLogType = (level: string): 'success' | 'info' | 'warning' | 'error' => {
  const types: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
    'INFO': 'success',
    'DEBUG': 'info',
    'WARNING': 'warning',
    'ERROR': 'error'
  }
  return types[level] || 'info'
}

const refreshLogs = () => {
  message.success('日志已刷新')
}
</script>

<style scoped>
.system-page {
  max-width: 1400px;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: rgba(255, 255, 255, 0.4);
  min-width: 70px;
}

.log-message {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
}

.log-entry.error .log-message {
  color: #ff6b6b;
}

.log-entry.warning .log-message {
  color: #ffd43b;
}
</style>