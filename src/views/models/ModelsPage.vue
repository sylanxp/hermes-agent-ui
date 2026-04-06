<template>
  <div class="models-page">
    <n-card>
      <template #header>
        <div class="card-header">
          <span>模型配置</span>
          <n-button type="primary" @click="showAddModal = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            添加模型
          </n-button>
        </div>
      </template>

      <n-grid :cols="3" :x-gap="16" :y-gap="16">
        <n-gi v-for="model in models" :key="model.id">
          <n-card class="model-card" :class="{ 'model-default': model.isDefault }">
            <div class="model-header">
              <div class="model-icon">
                <n-icon :size="28"><component :is="getModelIcon(model.provider)" /></n-icon>
              </div>
              <div class="model-info">
                <h3>{{ model.name }}</h3>
                <n-tag size="small" :type="getProviderType(model.provider)">{{ model.provider }}</n-tag>
              </div>
              <n-switch v-model:value="model.enabled" size="small" />
            </div>
            <n-divider style="margin: 12px 0" />
            <n-descriptions :column="1" size="small">
              <n-descriptions-item label="模型ID">
                <n-text code>{{ model.modelId }}</n-text>
              </n-descriptions-item>
              <n-descriptions-item label="API Base">{{ model.apiBase }}</n-descriptions-item>
              <n-descriptions-item label="调用次数">{{ model.calls.toLocaleString() }}</n-descriptions-item>
              <n-descriptions-item label="状态">
                <n-tag :type="model.status === 'ok' ? 'success' : 'error'" size="small">
                  {{ model.status === 'ok' ? '正常' : '异常' }}
                </n-tag>
              </n-descriptions-item>
            </n-descriptions>
            <template #footer>
              <n-space justify="space-between">
                <n-button size="small" @click="testModel(model)">
                  <template #icon><n-icon><PlayOutline /></n-icon></template>
                  测试
                </n-button>
                <n-space>
                  <n-button size="small" @click="editModel(model)">
                    <template #icon><n-icon><CreateOutline /></n-icon></template>
                  </n-button>
                  <n-button size="small" :type="model.isDefault ? 'warning' : 'default'" @click="setDefault(model)">
                    {{ model.isDefault ? '默认' : '设为默认' }}
                  </n-button>
                </n-space>
              </n-space>
            </template>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- 添加模型模态框 -->
    <n-modal v-model:show="showAddModal" preset="card" title="添加模型配置" style="width: 500px">
      <n-form :model="modelForm" label-placement="left" label-width="80">
        <n-form-item label="名称">
          <n-input v-model:value="modelForm.name" placeholder="显示名称" />
        </n-form-item>
        <n-form-item label="提供商">
          <n-select v-model:value="modelForm.provider" :options="providerOptions" />
        </n-form-item>
        <n-form-item label="模型ID">
          <n-input v-model:value="modelForm.modelId" placeholder="例如: gpt-4o" />
        </n-form-item>
        <n-form-item label="API Key">
          <n-input v-model:value="modelForm.apiKey" type="password" show-password-on="click" placeholder="sk-..." />
        </n-form-item>
        <n-form-item label="API Base">
          <n-input v-model:value="modelForm.apiBase" placeholder="https://api.openai.com/v1" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAddModal = false">取消</n-button>
          <n-button type="primary" @click="saveModel">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { AddOutline, CreateOutline, PlayOutline, CloudOutline, RocketOutline, SparklesOutline } from '@vicons/ionicons5'

const message = useMessage()
const showAddModal = ref(false)

const models = ref([
  { id: '1', name: 'GPT-4o', provider: 'OpenAI', modelId: 'gpt-4o', apiBase: 'https://api.openai.com/v1', enabled: true, isDefault: true, calls: 12500, status: 'ok' },
  { id: '2', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', modelId: 'claude-3-5-sonnet-20241022', apiBase: 'https://api.anthropic.com', enabled: true, isDefault: false, calls: 8900, status: 'ok' },
  { id: '3', name: 'Gemini Pro', provider: 'Google', modelId: 'gemini-2.5-pro', apiBase: 'https://generativelanguage.googleapis.com', enabled: true, isDefault: false, calls: 5600, status: 'ok' },
  { id: '4', name: 'DeepSeek', provider: 'DeepSeek', modelId: 'deepseek-chat', apiBase: 'https://api.deepseek.com', enabled: false, isDefault: false, calls: 1200, status: 'ok' }
])

const modelForm = ref({
  name: '',
  provider: 'OpenAI',
  modelId: '',
  apiKey: '',
  apiBase: ''
})

const providerOptions = [
  { label: 'OpenAI', value: 'OpenAI' },
  { label: 'Anthropic', value: 'Anthropic' },
  { label: 'Google', value: 'Google' },
  { label: 'DeepSeek', value: 'DeepSeek' },
  { label: 'OpenRouter', value: 'OpenRouter' }
]

const getModelIcon = (provider: string) => {
  const icons: Record<string, any> = {
    'OpenAI': SparklesOutline,
    'Anthropic': RocketOutline,
    'Google': CloudOutline,
    'DeepSeek': RocketOutline
  }
  return icons[provider] || CloudOutline
}

const getProviderType = (provider: string): 'success' | 'info' | 'warning' | 'default' => {
  const types: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    'OpenAI': 'success',
    'Anthropic': 'info',
    'Google': 'warning',
    'DeepSeek': 'default'
  }
  return types[provider] || 'default'
}

const testModel = (model: any) => {
  message.loading(`正在测试 ${model.name}...`)
  setTimeout(() => {
    message.success(`${model.name} 连接正常`)
  }, 1500)
}

const editModel = (model: any) => {
  message.info(`编辑模型: ${model.name}`)
}

const setDefault = (model: any) => {
  models.value.forEach(m => m.isDefault = false)
  model.isDefault = true
  message.success(`已将 ${model.name} 设为默认模型`)
}

const saveModel = () => {
  message.success('模型配置已保存')
  showAddModal.value = false
}
</script>

<style scoped>
.models-page {
  max-width: 1200px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-card {
  transition: all 0.3s;
}

.model-card.model-default {
  border: 2px solid #63e6be;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-info h3 {
  margin: 0;
  font-size: 16px;
}
</style>