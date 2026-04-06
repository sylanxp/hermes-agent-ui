<template>
  <div class="agents-page">
    <n-card>
      <template #header>
        <div class="card-header">
          <span>Agent 控制</span>
          <n-space>
            <n-button type="info" size="small" @click="refresh">
              <template #icon><n-icon><RefreshOutline /></n-icon></template>
              刷新
            </n-button>
          </n-space>
        </div>
      </template>

      <!-- Agent Status Overview -->
      <n-grid :cols="4" :x-gap="16" :y-gap="16" style="margin-bottom: 24px">
        <n-gi>
          <n-statistic label="网关状态">
            <template #prefix>
              <n-badge dot :type="agentStatus.gatewayRunning ? 'success' : 'error'" />
            </template>
            <n-tag :type="agentStatus.gatewayRunning ? 'success' : 'error'" size="large">
              {{ agentStatus.gatewayRunning ? '运行中' : '已停止' }}
            </n-tag>
          </n-statistic>
        </n-gi>
        <n-gi>
          <n-statistic label="API 服务">
            <template #prefix>
              <n-badge dot type="success" />
            </template>
            <n-tag type="success" size="large">运行中</n-tag>
          </n-statistic>
        </n-gi>
        <n-gi>
          <n-statistic label="HERMES_HOME">
            <template #prefix>
              <n-icon><FolderOutline /></n-icon>
            </template>
            <span style="font-size: 14px">{{ agentStatus.hermesHome || '-' }}</span>
          </n-statistic>
        </n-gi>
        <n-gi>
          <n-statistic label="上次检查">
            <span style="font-size: 14px">{{ agentStatus.lastCheck || '-' }}</span>
          </n-statistic>
        </n-gi>
      </n-grid>

      <!-- Control Buttons -->
      <n-space style="margin-bottom: 24px" justify="center">
        <n-button type="success" :loading="starting" :disabled="agentStatus.gatewayRunning" @click="startAgent">
          <template #icon><n-icon><PlayOutline /></n-icon></template>
          启动网关
        </n-button>
        <n-button type="warning" :loading="stopping" :disabled="!agentStatus.gatewayRunning" @click="stopAgent">
          <template #icon><n-icon><StopOutline /></n-icon></template>
          停止网关
        </n-button>
        <n-button type="info" :loading="restarting" @click="restartAgent">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          重启网关
        </n-button>
      </n-space>

      <!-- Running Processes -->
      <n-divider />
      <n-h4 style="margin-bottom: 16px">运行中的进程</n-h4>
      <n-data-table
        :columns="processColumns"
        :data="processes"
        :pagination="{ pageSize: 10 }"
        :bordered="false"
        size="small"
      />

      <!-- Logs -->
      <n-divider />
      <n-h4 style="margin-bottom: 16px">
        <n-space align="center">
          Agent 日志
          <n-button size="small" @click="loadLogs">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            刷新
          </n-button>
        </n-space>
      </n-h4>
      <n-card class="log-card">
        <pre class="log-content">{{ logs }}</pre>
      </n-card>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { useMessage, NTag, NSpace } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { PlayOutline, StopOutline, RefreshOutline, FolderOutline } from '@vicons/ionicons5'

const message = useMessage()

const agentStatus = ref({
  gatewayRunning: false,
  hermesHome: '',
  lastCheck: ''
})

const processes = ref<any[]>([])
const logs = ref('')
const starting = ref(false)
const stopping = ref(false)
const restarting = ref(false)

const processColumns: DataTableColumns<any> = [
  { title: 'PID', key: 'pid', width: 80 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  { 
    title: '状态', key: 'running', width: 80,
    render: (row) => h(NTag, {
      type: row.running ? 'success' : 'error',
      size: 'small'
    }, { default: () => row.running ? '运行中' : '已退出' })
  },
  { title: '启动时间', key: 'started', width: 180 }
]

async function loadStatus() {
  try {
    const res = await fetch('/api/health')
    const data = await res.json()
    agentStatus.value = {
      gatewayRunning: data.gatewayRunning || false,
      hermesHome: data.hermesHome || '',
      lastCheck: new Date(data.timestamp).toLocaleString('zh-CN')
    }
  } catch (e) {
    agentStatus.value = { gatewayRunning: false, hermesHome: '无法连接', lastCheck: new Date().toLocaleString('zh-CN') }
  }
}

async function loadProcesses() {
  try {
    const res = await fetch('/api/processes')
    processes.value = await res.json()
  } catch (e) {
    processes.value = []
  }
}

async function loadLogs() {
  try {
    const res = await fetch('/api/agent/logs')
    const data = await res.json()
    logs.value = data.output || '无日志输出'
  } catch (e) {
    logs.value = '无法加载日志'
  }
}

async function startAgent() {
  starting.value = true
  try {
    const res = await fetch('/api/agent/start', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      message.success('网关启动成功')
    } else {
      message.warning(data.error || '启动失败')
    }
  } catch (e) {
    message.error('启动失败')
  } finally {
    starting.value = false
    setTimeout(loadStatus, 2000)
  }
}

async function stopAgent() {
  stopping.value = true
  try {
    const res = await fetch('/api/agent/stop', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      message.success('网关已停止')
    } else {
      message.warning(data.error || '停止失败')
    }
  } catch (e) {
    message.error('停止失败')
  } finally {
    stopping.value = false
    setTimeout(loadStatus, 2000)
  }
}

async function restartAgent() {
  restarting.value = true
  try {
    const res = await fetch('/api/agent/restart', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      message.success('网关重启成功')
    } else {
      message.warning(data.error || '重启失败')
    }
  } catch (e) {
    message.error('重启失败')
  } finally {
    restarting.value = false
    setTimeout(loadStatus, 3000)
  }
}

async function refresh() {
  await Promise.all([loadStatus(), loadProcesses(), loadLogs()])
}

onMounted(refresh)
</script>

<style scoped>
.agents-page { max-width: 1200px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.log-card { background: #1a1a2e; }
.log-content {
  margin: 0;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #a0fab0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.5;
}
</style>
