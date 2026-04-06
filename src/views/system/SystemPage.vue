<template>
  <div class="system-page">
    <n-grid :cols="2" :x-gap="16" :y-gap="16">
      <n-gi>
        <n-spin :show="loading">
          <n-card title="系统资源">
            <n-descriptions :column="1" label-placement="left">
              <n-descriptions-item label="运行时间">{{ systemInfo.uptime || '加载中...' }}</n-descriptions-item>
              <n-descriptions-item label="CPU 负载">
                <n-progress type="line" :percentage="systemInfo.cpuPercent || 0" :stroke-width="12">
                  {{ systemInfo.cpuLoad || 'N/A' }}
                </n-progress>
              </n-descriptions-item>
              <n-descriptions-item label="内存使用">
                <n-space vertical style="width: 100%">
                  <n-progress type="line" :percentage="systemInfo.memoryPercent || 0" :stroke-width="12">
                    {{ systemInfo.memory?.used }}MB / {{ systemInfo.memory?.total }}MB
                  </n-progress>
                  <n-text depth="3" style="font-size: 12px">可用: {{ systemInfo.memory?.available }}MB</n-text>
                </n-space>
              </n-descriptions-item>
              <n-descriptions-item label="磁盘使用">
                <n-space vertical style="width: 100%">
                  <n-progress type="line" :percentage="Number(systemInfo.diskPercent) || 0" :stroke-width="12" :color="diskColor">
                    {{ systemInfo.disk?.used }} / {{ systemInfo.disk?.total }}
                  </n-progress>
                  <n-text depth="3" style="font-size: 12px">可用: {{ systemInfo.disk?.available }}</n-text>
                </n-space>
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-spin>
      </n-gi>

      <n-gi>
        <n-spin :show="loading">
          <n-card title="网关状态">
            <n-descriptions :column="1" label-placement="left">
              <n-descriptions-item label="运行状态">
                <n-tag :type="health.gatewayRunning ? 'success' : 'error'">
                  {{ health.gatewayRunning ? '运行中' : '已停止' }}
                </n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="状态">{{ health.status || 'N/A' }}</n-descriptions-item>
              <n-descriptions-item label="HERMES_HOME">{{ health.hermesHome || 'N/A' }}</n-descriptions-item>
              <n-descriptions-item label="最后更新">{{ health.lastCheck || 'N/A' }}</n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-spin>
      </n-gi>

      <n-gi :span="24">
        <n-spin :show="loading">
          <n-card title="运行中的进程">
            <n-data-table
              :columns="processColumns"
              :data="processes"
              :bordered="false"
              size="small"
              :pagination="{ pageSize: 10 }"
            />
          </n-card>
        </n-spin>
      </n-gi>
    </n-grid>

    <n-space style="margin-top: 16px" justify="end">
      <n-button @click="refresh">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>
        刷新
      </n-button>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { ref, h, computed, onMounted } from 'vue'
import { NTag, NProgress, NButton, NSpace, NText } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'

const loading = ref(false)

const systemInfo = ref<any>({})
const health = ref<any>({})
const processes = ref<any[]>([])

const diskColor = computed(() => {
  const pct = Number(systemInfo.value.diskPercent) || 0
  if (pct > 90) return '#ff4d4f'
  if (pct > 70) return '#faad14'
  return '#52c41a'
})

const processColumns: DataTableColumns<any> = [
  { title: 'PID', key: 'pid', width: 80 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  {
    title: '状态', key: 'running', width: 100,
    render: (row) => h(NTag, {
      type: row.running ? 'success' : 'error',
      size: 'small'
    }, { default: () => row.running ? '运行中' : '已退出' })
  },
  { title: '启动时间', key: 'started', width: 180 }
]

async function loadSystem() {
  try {
    const res = await fetch('/api/system')
    const data = await res.json()
    systemInfo.value = data
  } catch (e) {}
}

async function loadHealth() {
  try {
    const res = await fetch('/api/health')
    const data = await res.json()
    data.lastCheck = new Date(data.timestamp).toLocaleString('zh-CN')
    health.value = data
  } catch (e) {}
}

async function loadProcesses() {
  try {
    const res = await fetch('/api/processes')
    processes.value = await res.json()
  } catch (e) {
    processes.value = []
  }
}

async function refresh() {
  loading.value = true
  try {
    await Promise.all([loadSystem(), loadHealth(), loadProcesses()])
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>

<style scoped>
.system-page { max-width: 1200px; }
</style>
