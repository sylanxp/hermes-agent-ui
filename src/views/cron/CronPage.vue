<template>
  <div class="cron-page">
    <n-card>
      <template #header>
        <div class="card-header">
          <span>定时任务</span>
          <n-button type="primary" @click="showCreateModal = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            创建任务
          </n-button>
        </div>
      </template>

      <n-data-table
        :columns="columns"
        :data="cronJobs"
        :pagination="false"
        :bordered="false"
      />
    </n-card>

    <!-- 创建任务模态框 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="创建定时任务" style="width: 600px">
      <n-form :model="createForm" label-placement="left" label-width="100">
        <n-form-item label="任务名称">
          <n-input v-model:value="createForm.name" placeholder="例如: daily_report" />
        </n-form-item>
        <n-form-item label="调度类型">
          <n-radio-group v-model:value="createForm.scheduleType">
            <n-radio-button value="interval">固定间隔</n-radio-button>
            <n-radio-button value="cron">Cron 表达式</n-radio-button>
            <n-radio-button value="once">指定时间</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="调度配置">
          <n-input 
            v-if="createForm.scheduleType === 'cron'"
            v-model:value="createForm.schedule" 
            placeholder="0 9 * * * (每天 9:00)"
          />
          <n-input-number 
            v-else-if="createForm.scheduleType === 'interval'"
            v-model:value="createForm.interval"
            :min="1"
          >
            <template #suffix>分钟</template>
          </n-input-number>
          <n-date-picker 
            v-else
            v-model:value="createForm.scheduledTime"
            type="datetime"
            clearable
          />
        </n-form-item>
        <n-form-item label="执行内容">
          <n-input 
            v-model:value="createForm.prompt" 
            type="textarea" 
            placeholder="描述任务内容..."
            :rows="4"
          />
        </n-form-item>
        <n-form-item label="投递目标">
          <n-select v-model:value="createForm.deliver" :options="deliverOptions" />
        </n-form-item>
        <n-form-item label="启用状态">
          <n-switch v-model:value="createForm.enabled" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="createCron">创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 执行历史抽屉 -->
    <n-drawer v-model:show="showHistoryDrawer" :width="500" placement="right">
      <n-drawer-content title="执行历史" closable>
        <n-timeline>
          <n-timeline-item 
            v-for="history in executionHistory" 
            :key="history.id"
            :type="history.success ? 'success' : 'error'"
            :title="history.time"
          >
            <p>{{ history.status }}</p>
            <p class="history-output" v-if="history.output">{{ history.output }}</p>
          </n-timeline-item>
        </n-timeline>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { NButton, NSpace, NSwitch, NTag, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'

const message = useMessage()
const showCreateModal = ref(false)
const showHistoryDrawer = ref(false)

interface CronJob {
  id: string
  name: string
  schedule: string
  nextRun: string
  enabled: boolean
  status: 'running' | 'paused' | 'completed'
}

const cronJobs = ref<CronJob[]>([
  { id: '1', name: 'daily_report', schedule: '0 9 * * *', nextRun: '明天 09:00', enabled: true, status: 'running' },
  { id: '2', name: 'health_check', schedule: '每 30 分钟', nextRun: '10:45', enabled: true, status: 'running' },
  { id: '3', name: 'weekly_summary', schedule: '0 18 * * 5', nextRun: '周五 18:00', enabled: false, status: 'paused' },
  { id: '4', name: 'backup_data', schedule: '0 2 * * *', nextRun: '明天 02:00', enabled: true, status: 'running' }
])

const executionHistory = ref([
  { id: 1, time: '今天 09:00', success: true, status: '执行成功', output: '日报已发送到 Telegram' },
  { id: 2, time: '昨天 09:00', success: true, status: '执行成功', output: '日报已发送到 Telegram' },
  { id: 3, time: '前天 09:00', success: false, status: '执行失败', output: 'API 超时，已自动重试' }
])

const createForm = ref({
  name: '',
  scheduleType: 'cron',
  schedule: '',
  interval: 30,
  scheduledTime: null as number | null,
  prompt: '',
  deliver: 'telegram',
  enabled: true
})

const deliverOptions = [
  { label: 'Telegram', value: 'telegram' },
  { label: '飞书', value: 'feishu' },
  { label: '钉钉', value: 'dingtalk' },
  { label: '本地文件', value: 'local' }
]

const columns: DataTableColumns<CronJob> = [
  { title: '任务名称', key: 'name' },
  { title: '调度配置', key: 'schedule' },
  { title: '下次执行', key: 'nextRun' },
  { 
    title: '状态', 
    key: 'status',
    render: (row) => h(NTag, { type: row.enabled ? 'success' : 'default', size: 'small' }, { default: () => row.enabled ? '运行中' : '已暂停' })
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) => h(NSpace, null, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => toggleJob(row) }, { default: () => row.enabled ? '暂停' : '启用' }),
        h(NButton, { size: 'small', onClick: () => runJob(row) }, { default: () => '立即执行' }),
        h(NButton, { size: 'small', onClick: () => showHistory(row) }, { default: () => '历史' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => deleteJob(row) }, { default: () => '删除' })
      ]
    })
  }
]

const toggleJob = (row: CronJob) => {
  row.enabled = !row.enabled
  message.success(row.enabled ? '任务已启用' : '任务已暂停')
}

const runJob = (row: CronJob) => {
  message.info(`正在执行任务: ${row.name}`)
}

const showHistory = (row: CronJob) => {
  showHistoryDrawer.value = true
}

const deleteJob = (row: CronJob) => {
  message.success(`已删除任务: ${row.name}`)
}

const createCron = () => {
  if (!createForm.value.name || !createForm.value.prompt) {
    message.error('请填写完整信息')
    return
  }
  message.success('任务创建成功')
  showCreateModal.value = false
}
</script>

<style scoped>
.cron-page {
  max-width: 1200px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-output {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
}
</style>