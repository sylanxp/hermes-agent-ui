<template>
  <div class="settings-page">
    <n-tabs type="line" animated>
      <n-tab-pane name="general" tab="常规设置">
        <n-card>
          <n-form :model="generalSettings" label-placement="left" label-width="120">
            <n-form-item label="默认模型">
              <n-select v-model:value="generalSettings.defaultModel" :options="modelOptions" />
            </n-form-item>
            <n-form-item label="默认语言">
              <n-select v-model:value="generalSettings.language" :options="languageOptions" />
            </n-form-item>
            <n-form-item label="时区">
              <n-select v-model:value="generalSettings.timezone" :options="timezoneOptions" />
            </n-form-item>
            <n-form-item label="主题">
              <n-radio-group v-model:value="generalSettings.theme">
                <n-radio-button value="dark">深色</n-radio-button>
                <n-radio-button value="light">浅色</n-radio-button>
                <n-radio-button value="auto">跟随系统</n-radio-button>
              </n-radio-group>
            </n-form-item>
            <n-form-item label="自动保存">
              <n-switch v-model:value="generalSettings.autoSave" />
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="ai" tab="AI 设置">
        <n-card>
          <n-form :model="aiSettings" label-placement="left" label-width="120">
            <n-form-item label="Temperature">
              <n-slider v-model:value="aiSettings.temperature" :min="0" :max="2" :step="0.1" />
              <span style="margin-left: 12px; min-width: 40px">{{ aiSettings.temperature }}</span>
            </n-form-item>
            <n-form-item label="Max Tokens">
              <n-input-number v-model:value="aiSettings.maxTokens" :min="100" :max="128000" :step="100" />
            </n-form-item>
            <n-form-item label="Top P">
              <n-slider v-model:value="aiSettings.topP" :min="0" :max="1" :step="0.05" />
              <span style="margin-left: 12px; min-width: 40px">{{ aiSettings.topP }}</span>
            </n-form-item>
            <n-form-item label="流式输出">
              <n-switch v-model:value="aiSettings.streaming" />
            </n-form-item>
            <n-form-item label="自动重试">
              <n-switch v-model:value="aiSettings.autoRetry" />
            </n-form-item>
            <n-form-item label="重试次数">
              <n-input-number v-model:value="aiSettings.retryCount" :min="1" :max="5" />
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="notifications" tab="通知设置">
        <n-card>
          <n-form :model="notifySettings" label-placement="left" label-width="120">
            <n-form-item label="任务完成通知">
              <n-switch v-model:value="notifySettings.taskComplete" />
            </n-form-item>
            <n-form-item label="错误告警">
              <n-switch v-model:value="notifySettings.errorAlert" />
            </n-form-item>
            <n-form-item label="系统通知">
              <n-switch v-model:value="notifySettings.systemNotify" />
            </n-form-item>
            <n-form-item label="邮件通知">
              <n-switch v-model:value="notifySettings.emailNotify" />
            </n-form-item>
            <n-form-item label="通知邮箱">
              <n-input v-model:value="notifySettings.email" :disabled="!notifySettings.emailNotify" />
            </n-form-item>
            <n-form-item label="免打扰时段">
              <n-time-picker v-model:value="notifySettings.quietStart" :disabled="!notifySettings.quietMode" />
              <span style="margin: 0 8px">至</span>
              <n-time-picker v-model:value="notifySettings.quietEnd" :disabled="!notifySettings.quietMode" />
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="security" tab="安全设置">
        <n-card>
          <n-form :model="securitySettings" label-placement="left" label-width="120">
            <n-form-item label="API 密钥">
              <n-input-group>
                <n-input v-model:value="securitySettings.apiKey" type="password" show-password-on="click" disabled style="flex: 1" />
                <n-button @click="regenerateKey">重新生成</n-button>
              </n-input-group>
            </n-form-item>
            <n-form-item label="会话超时">
              <n-input-number v-model:value="securitySettings.sessionTimeout" :min="5" :max="1440">
                <template #suffix>分钟</template>
              </n-input-number>
            </n-form-item>
            <n-form-item label="IP 白名单">
              <n-dynamic-tags v-model:value="securitySettings.ipWhitelist" />
            </n-form-item>
            <n-form-item label="操作日志">
              <n-switch v-model:value="securitySettings.auditLog" />
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="advanced" tab="高级设置">
        <n-card>
          <n-form :model="advancedSettings" label-placement="left" label-width="150">
            <n-form-item label="工作目录">
              <n-input v-model:value="advancedSettings.workDir" />
            </n-form-item>
            <n-form-item label="日志级别">
              <n-select v-model:value="advancedSettings.logLevel" :options="logLevelOptions" />
            </n-form-item>
            <n-form-item label="缓存有效期">
              <n-input-number v-model:value="advancedSettings.cacheTTL" :min="60" :max="86400">
                <template #suffix>秒</template>
              </n-input-number>
            </n-form-item>
            <n-form-item label="并发限制">
              <n-input-number v-model:value="advancedSettings.concurrency" :min="1" :max="10" />
            </n-form-item>
          </n-form>
          <n-divider />
          <n-h4>危险操作</n-h4>
          <n-space>
            <n-button type="warning" @click="clearCache">清除缓存</n-button>
            <n-button type="error" @click="resetSettings">重置所有设置</n-button>
          </n-space>
        </n-card>
      </n-tab-pane>
    </n-tabs>

    <div class="save-bar">
      <n-button type="primary" size="large" @click="saveSettings">
        <template #icon><n-icon><SaveOutline /></n-icon></template>
        保存设置
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { SaveOutline } from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()

const generalSettings = ref({
  defaultModel: 'gpt-4o',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  theme: 'dark',
  autoSave: true
})

const aiSettings = ref({
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
  streaming: true,
  autoRetry: true,
  retryCount: 3
})

const notifySettings = ref({
  taskComplete: true,
  errorAlert: true,
  systemNotify: true,
  emailNotify: false,
  email: '',
  quietMode: false,
  quietStart: null,
  quietEnd: null
})

const securitySettings = ref({
  apiKey: 'sk-xxxx-xxxx-xxxx-xxxx',
  sessionTimeout: 60,
  ipWhitelist: ['127.0.0.1', '192.168.1.0/24'],
  auditLog: true
})

const advancedSettings = ref({
  workDir: '/home/user/workspace',
  logLevel: 'INFO',
  cacheTTL: 3600,
  concurrency: 5
})

const modelOptions = [
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
  { label: 'Gemini Pro', value: 'gemini-2.5-pro' }
]

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

const timezoneOptions = [
  { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
  { label: 'UTC', value: 'UTC' },
  { label: 'America/New_York', value: 'America/New_York' }
]

const logLevelOptions = [
  { label: 'DEBUG', value: 'DEBUG' },
  { label: 'INFO', value: 'INFO' },
  { label: 'WARNING', value: 'WARNING' },
  { label: 'ERROR', value: 'ERROR' }
]

const regenerateKey = () => {
  dialog.warning({
    title: '重新生成密钥',
    content: '重新生成后，旧密钥将立即失效。确定继续吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: () => {
      message.success('新密钥已生成')
    }
  })
}

const clearCache = () => {
  dialog.warning({
    title: '清除缓存',
    content: '确定要清除所有缓存吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: () => {
      message.success('缓存已清除')
    }
  })
}

const resetSettings = () => {
  dialog.error({
    title: '重置设置',
    content: '所有设置将恢复为默认值，此操作不可撤销。确定继续吗？',
    positiveText: '确认重置',
    negativeText: '取消',
    onPositiveClick: () => {
      message.success('设置已重置')
    }
  })
}

const saveSettings = () => {
  message.success('设置已保存')
}
</script>

<style scoped>
.settings-page {
  max-width: 800px;
}

.save-bar {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
}
</style>