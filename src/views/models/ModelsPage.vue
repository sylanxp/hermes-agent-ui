<template>
  <div class="models-page">
    <n-spin :show="loading">
      <!-- Current Model -->
      <n-card title="当前模型" style="margin-bottom: 24px">
        <n-descriptions :column="2" label-placement="left" bordered>
          <n-descriptions-item label="模型">{{ currentModel || '未设置' }}</n-descriptions-item>
          <n-descriptions-item label="Provider">{{ currentProvider || '未设置' }}</n-descriptions-item>
        </n-descriptions>
      </n-card>

      <!-- Available Models -->
      <n-card title="可用模型">
        <n-data-table
          :columns="columns"
          :data="availableModels"
          :bordered="false"
          :pagination="{ pageSize: 20 }"
          size="small"
        />
      </n-card>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { useMessage, useDialog, NTag, NButton, NSpace } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const changing = ref(false)

const currentModel = ref('')
const currentProvider = ref('')

interface ModelInfo {
  name: string
  provider: string
  isCurrent: boolean
}

const availableModels = ref<ModelInfo[]>([])

const columns: DataTableColumns<ModelInfo> = [
  { title: '模型名称', key: 'name', ellipsis: { tooltip: true } },
  {
    title: 'Provider',
    key: 'provider',
    width: 150,
    render: (row) => h(NTag, {
      type: row.isCurrent ? 'success' : 'default',
      size: 'small'
    }, { default: () => row.provider })
  },
  {
    title: '状态',
    key: 'isCurrent',
    width: 80,
    render: (row) => h(NTag, {
      type: row.isCurrent ? 'success' : 'default',
      size: 'small'
    }, { default: () => row.isCurrent ? '当前' : '可用' })
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => h(NButton, {
      size: 'small',
      type: row.isCurrent ? 'default' : 'primary',
      disabled: row.isCurrent,
      loading: changing.value,
      onClick: () => switchModel(row)
    }, { default: () => row.isCurrent ? '使用中' : '切换' })
  }
]

async function loadModels() {
  loading.value = true
  try {
    const res = await fetch('/api/models')
    const data = await res.json()
    currentModel.value = data.current || data.defaultModel || 'N/A'
    currentProvider.value = data.provider || 'unknown'
    availableModels.value = (data.available || []).map((m: string) => {
      const provider = m.split('/')[0] || 'default'
      return {
        name: m,
        provider: m.includes('/') ? m.split('/')[0] : data.provider || 'default',
        isCurrent: m === data.current || m === data.defaultModel
      }
    })
  } catch (e) {
    message.error('加载模型列表失败')
  } finally {
    loading.value = false
  }
}

async function switchModel(model: ModelInfo) {
  dialog.info({
    title: '切换模型',
    content: `确定将默认模型切换为 ${model.name} 吗？`,
    positiveText: '确认切换',
    negativeText: '取消',
    onPositiveClick: async () => {
      changing.value = true
      try {
        const res = await fetch('/api/config/model', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: model.name, provider: model.provider })
        })
        const data = await res.json()
        if (data.success) {
          message.success(`已切换为 ${model.name}`)
          await loadModels()
        } else {
          message.error(data.error || '切换失败')
        }
      } catch (e) {
        message.error('切换失败')
      } finally {
        changing.value = false
      }
    }
  })
}

onMounted(loadModels)
</script>

<style scoped>
.models-page { max-width: 1000px; }
</style>
