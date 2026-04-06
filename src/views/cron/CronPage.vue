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

      <n-spin :show="loading">
        <n-data-table
          v-if="cronJobs.length > 0"
          :columns="columns"
          :data="cronJobs"
          :pagination="{ pageSize: 10 }"
          :bordered="false"
        />
        <n-empty v-else description="暂无定时任务" />
      </n-spin>
    </n-card>

    <!-- Create Job Modal -->
    <n-modal v-model:show="showCreateModal" preset="card" title="创建定时任务" style="width: 550px">
      <n-form :model="createForm" label-placement="left" label-width="80">
        <n-form-item label="名称">
          <n-input v-model:value="createForm.name" placeholder="任务名称" />
        </n-form-item>
        <n-form-item label="计划">
          <n-input v-model:value="createForm.schedule" placeholder="如: 0 9 * * * 或 every 2h" />
          <n-text depth="3" style="font-size: 12px; margin-top: 4px">支持 cron 表达式或简单间隔 (30m, 1h, 24h)</n-text>
        </n-form-item>
        <n-form-item label="提示词">
          <n-input v-model:value="createForm.prompt" type="textarea" :rows="4" placeholder="定时执行的任务指令..." />
        </n-form-item>
        <n-form-item label="发送目标">
          <n-select v-model:value="createForm.deliver" :options="deliverOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" :loading="creating" @click="createJob">创建</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { useMessage, useDialog, NTag, NButton, NSpace, NText } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { AddOutline, PlayOutline, PauseOutline, TrashOutline } from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const creating = ref(false)
const showCreateModal = ref(false)

interface CronJob {
  id: string
  name: string
  schedule: string
  prompt: string
  deliver: string
  paused: boolean
  nextRun?: string
}

const cronJobs = ref<CronJob[]>([])
const createForm = ref({
  name: '',
  schedule: '',
  prompt: '',
  deliver: 'origin'
})

const deliverOptions = [
  { label: '原路返回', value: 'origin' },
  { label: '本地文件', value: 'local' },
  { label: 'Telegram', value: 'telegram' }
]

const columns: DataTableColumns<CronJob> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  { title: '计划', key: 'schedule', width: 120 },
  { title: '提示词', key: 'prompt', ellipsis: { tooltip: true } },
  { 
    title: '发送目标', key: 'deliver', width: 100,
    render: (row) => h(NTag, { type: 'info', size: 'small' }, { default: () => row.deliver })
  },
  {
    title: '状态', key: 'paused', width: 80,
    render: (row) => h(NTag, {
      type: row.paused ? 'warning' : 'success',
      size: 'small'
    }, { default: () => row.paused ? '已暂停' : '运行中' })
  },
  {
    title: '操作', key: 'actions', width: 200,
    render: (row) => h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, {
          size: 'small',
          type: row.paused ? 'success' : 'warning',
          onClick: () => toggleJob(row)
        }, { default: () => row.paused ? '恢复' : '暂停' }),
        h(NButton, {
          size: 'small',
          type: 'error',
          onClick: () => removeJob(row)
        }, { default: () => '删除' })
      ]
    })
  }
]

async function loadJobs() {
  loading.value = true
  try {
    const res = await fetch('/api/cron')
    const data = await res.json()
    // Parse CLI output or use structured data
    if (data.jobs) {
      cronJobs.value = data.jobs
    } else {
      // Fallback: try to parse text output
      cronJobs.value = []
    }
  } catch (e) {
    message.error('加载任务失败')
  } finally {
    loading.value = false
  }
}

async function createJob() {
  if (!createForm.value.prompt || !createForm.value.schedule) {
    message.warning('请填写计划和时间')
    return
  }
  creating.value = true
  try {
    // We use the CLI via API
    const res = await fetch('/api/cron/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm.value)
    })
    const data = await res.json()
    if (data.success) {
      message.success('任务创建成功')
      showCreateModal.value = false
      createForm.value = { name: '', schedule: '', prompt: '', deliver: 'origin' }
      await loadJobs()
    } else {
      message.error(data.error || '创建失败')
    }
  } catch (e) {
    message.error('创建失败')
  } finally {
    creating.value = false
  }
}

async function toggleJob(job: CronJob) {
  const action = job.paused ? 'resume' : 'pause'
  try {
    const res = await fetch(`/api/cron/${action}/${job.id}`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      message.success(`已${action === 'pause' ? '暂停' : '恢复'}任务`)
      await loadJobs()
    } else {
      message.error(data.error || '操作失败')
    }
  } catch (e) {
    message.error('操作失败')
  }
}

async function removeJob(job: CronJob) {
  dialog.warning({
    title: '删除任务',
    content: `确定删除任务 "${job.name}" 吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res = await fetch(`/api/cron/remove/${job.id}`, { method: 'POST' })
        const data = await res.json()
        if (data.success) {
          message.success('已删除')
          await loadJobs()
        } else {
          message.error(data.error || '删除失败')
        }
      } catch (e) {
        message.error('删除失败')
      }
    }
  })
}

onMounted(loadJobs)
</script>

<style scoped>
.cron-page { max-width: 1200px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
