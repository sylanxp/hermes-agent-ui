<template>
  <div class="settings-page">
    <n-spin :show="loading">
      <n-tabs type="line" animated>
        <n-tab-pane name="general" tab="常规设置">
          <n-card>
            <n-form :model="generalSettings" label-placement="left" label-width="120">
              <n-form-item label="默认模型">
                <n-select v-model:value="generalSettings.defaultModel" :options="modelOptions" />
              </n-form-item>
              <n-form-item label="Provider">
                <n-input v-model:value="generalSettings.provider" disabled />
              </n-form-item>
              <n-form-item label="Base URL">
                <n-input v-model:value="generalSettings.base_url" disabled />
              </n-form-item>
              <n-form-item label="最大轮次">
                <n-input-number v-model:value="generalSettings.maxTurns" :min="10" :max="200" :step="10" />
              </n-form-item>
              <n-form-item label="后端">
                <n-input v-model:value="generalSettings.backend" disabled />
              </n-form-item>
            </n-form>
          </n-card>
        </n-tab-pane>

        <n-tab-pane name="gateway" tab="网设置">
          <n-card>
            <n-descriptions :column="1" label-placement="left" bordered>
              <n-descriptions-item label="网关运行中">
                <n-tag :type="gatewayStatus.isRunning ? 'success' : 'error'">
                  {{ gatewayStatus.isRunning ? '是' : '否' }}
                </n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="状态">{{ gatewayStatus.state || 'N/A' }}</n-descriptions-item>
              <n-descriptions-item label="PID">{{ gatewayStatus.pid || 'N/A' }}</n-descriptions-item>
              <n-descriptions-item label="最后更新">{{ gatewayStatus.lastUpdate || 'N/A' }}</n-descriptions-item>
            </n-descriptions>
            <n-divider />
            <n-space>
              <n-button type="info" @click="refreshAll">
                <template #icon><n-icon><RefreshOutline /></n-icon></template>
                刷新状态
              </n-button>
            </n-space>
          </n-card>
        </n-tab-pane>

        <n-tab-pane name="memory" tab="内存管理">
          <n-card>
            <n-descriptions :column="1" label-placement="left" bordered>
              <n-descriptions-item label="内置记忆状态">
                <n-tag type="success">运行中</n-tag>
                <span style="margin-left: 12px; color: rgba(255,255,255,0.5)">USER.md + MEMORY.md</span>
              </n-descriptions-item>
              <n-descriptions-item label="外部 Provider">
                <n-tag type="default">未启用</n-tag>
                <span style="margin-left: 12px; color: rgba(255,255,255,0.5)">hermes memory setup</span>
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-tab-pane>

        <n-tab-pane name="danger" tab="高级设置">
          <n-card>
            <n-h4>数据管理</n-h4>
            <n-space vertical>
              <n-button type="warning" @click="pruneSessions">
                清理过期会话
              </n-button>
              <n-button type="error" @click="resetSettings">
                重置配置
              </n-button>
            </n-space>
          </n-card>
        </n-tab-pane>
      </n-tabs>

      <div class="save-bar">
        <n-button type="primary" size="large" :loading="saving" @click="saveSettings">
          <template #icon><n-icon><SaveOutline /></n-icon></template>
          保存设置
        </n-button>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { SaveOutline, RefreshOutline } from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const saving = ref(false)

const generalSettings = ref({
  defaultModel: '',
  provider: '',
  base_url: '',
  maxTurns: 60,
  backend: 'local'
})

const gatewayStatus = ref({
  isRunning: false,
  state: '',
  pid: null as number | null,
  lastUpdate: ''
})

const modelOptions = ref<{ label: string; value: string }[]>([])

async function loadConfig() {
  try {
    const res = await fetch('/api/config')
    const data = await res.json()
    generalSettings.value = {
      defaultModel: data.defaultModel || 'N/A',
      provider: data.provider || 'unknown',
      base_url: data.base_url || '',
      maxTurns: data.maxTurns || 60,
      backend: data.backend || 'local'
    }
  } catch (e) {
    message.error('加载配置失败')
  }
}

async function loadGateway() {
  try {
    const res = await fetch('/api/gateway')
    const data = await res.json()
    gatewayStatus.value = {
      isRunning: data.isRunning || false,
      state: data.state || 'stopped',
      pid: data.pid || null,
      lastUpdate: data.lastUpdate || ''
    }
  } catch (e) {}
}

async function loadModels() {
  try {
    const res = await fetch('/api/models')
    const data = await res.json()
    modelOptions.value = (data.available || []).map((m: string) => ({ label: m, value: m }))
  } catch (e) {}
}

async function saveSettings() {
  saving.value = true
  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        max_turns: generalSettings.value.maxTurns,
        default: generalSettings.value.defaultModel
      })
    })
    const data = await res.json()
    if (data.success) {
      message.success('配置已保存')
      await loadConfig()
    } else {
      message.error(data.error || '保存失败')
    }
  } catch (e) {
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

function pruneSessions() {
  dialog.warning({
    title: '清理会话',
    content: '确定清理 7 天前的过期会话吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: () => message.success('会话清理已触发')
  })
}

function resetSettings() {
  dialog.error({
    title: '重置配置',
    content: '所有设置将恢复为默认值。确定继续吗？',
    positiveText: '确认重置',
    negativeText: '取消',
    onPositiveClick: () => message.warning('重置功能需要手动操作 config.yaml')
  })
}

async function refreshAll() {
  await Promise.all([loadConfig(), loadGateway(), loadModels()])
}

onMounted(refreshAll)
</script>

<style scoped>
.settings-page { max-width: 800px; }
.save-bar { position: fixed; bottom: 24px; right: 24px; z-index: 100; }
</style>
