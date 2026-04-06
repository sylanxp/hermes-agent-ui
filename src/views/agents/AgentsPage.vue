<template>
  <div class="agents-page">
    <n-card>
      <template #header>
        <div class="card-header">
          <span>多智能体管理</span>
          <n-button type="primary" @click="showCreateModal = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            创建智能体
          </n-button>
        </div>
      </template>

      <n-grid :cols="3" :x-gap="16" :y-gap="16">
        <n-gi v-for="agent in agents" :key="agent.id">
          <n-card class="agent-card" hoverable>
            <div class="agent-avatar">
              <n-avatar 
                :size="64" 
                :style="{ background: agent.color }"
                round
              >
                {{ agent.name.charAt(0) }}
              </n-avatar>
              <n-badge 
                :value="agent.status === 'online' ? '在线' : '离线'" 
                :type="agent.status === 'online' ? 'success' : 'default'"
                :offset="[-8, 50]"
              />
            </div>
            <h3 class="agent-name">{{ agent.name }}</h3>
            <p class="agent-desc">{{ agent.description }}</p>
            <n-space style="margin-top: 8px">
              <n-tag size="small" :type="agent.role === 'worker' ? 'info' : 'success'">
                {{ agent.role === 'coordinator' ? '协调者' : '执行者' }}
              </n-tag>
              <n-tag size="small">{{ agent.model }}</n-tag>
            </n-space>
            <n-divider style="margin: 12px 0" />
            <n-descriptions :column="1" size="small">
              <n-descriptions-item label="任务数">{{ agent.tasks }}</n-descriptions-item>
              <n-descriptions-item label="成功率">{{ agent.successRate }}%</n-descriptions-item>
            </n-descriptions>
            <template #footer>
              <n-space justify="space-between">
                <n-button size="small" @click="viewAgent(agent)">详情</n-button>
                <n-space>
                  <n-button size="small" @click="editAgent(agent)">编辑</n-button>
                  <n-button size="small" type="error" @click="deleteAgent(agent)">删除</n-button>
                </n-space>
              </n-space>
            </template>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- 创建智能体模态框 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="创建智能体" style="width: 550px">
      <n-form :model="createForm" label-placement="left" label-width="80">
        <n-form-item label="名称">
          <n-input v-model:value="createForm.name" placeholder="智能体名称" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="createForm.description" type="textarea" :rows="2" placeholder="智能体描述" />
        </n-form-item>
        <n-form-item label="角色">
          <n-radio-group v-model:value="createForm.role">
            <n-radio-button value="worker">执行者</n-radio-button>
            <n-radio-button value="coordinator">协调者</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="模型">
          <n-select v-model:value="createForm.model" :options="modelOptions" />
        </n-form-item>
        <n-form-item label="技能">
          <n-select v-model:value="createForm.skills" multiple :options="skillOptions" placeholder="选择技能" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="createAgent">创建</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()
const showCreateModal = ref(false)

const agents = ref([
  { id: '1', name: 'Hermes', description: '主智能体，负责任务协调与分发', role: 'coordinator', model: 'gpt-4o', status: 'online', color: 'linear-gradient(135deg, #63e6be, #1a7f64)', tasks: 1250, successRate: 98.5 },
  { id: '2', name: 'Coder', description: '代码生成与调试专家', role: 'worker', model: 'claude-3-5-sonnet', status: 'online', color: 'linear-gradient(135deg, #ffd43b, #fab005)', tasks: 890, successRate: 96.2 },
  { id: '3', name: 'Analyst', description: '数据分析与可视化', role: 'worker', model: 'gemini-2.5-pro', status: 'online', color: 'linear-gradient(135deg, #69db7c, #37b24d)', tasks: 456, successRate: 94.8 },
  { id: '4', name: 'Writer', description: '文档编写与内容生成', role: 'worker', model: 'gpt-4o-mini', status: 'offline', color: 'linear-gradient(135deg, #ff922b, #e8590c)', tasks: 234, successRate: 97.1 }
])

const createForm = ref({
  name: '',
  description: '',
  role: 'worker',
  model: 'gpt-4o',
  skills: []
})

const modelOptions = [
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
  { label: 'Gemini Pro', value: 'gemini-2.5-pro' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' }
]

const skillOptions = [
  { label: 'GitHub 工作流', value: 'github-pr-workflow' },
  { label: '代码分析', value: 'codebase-inspection' },
  { label: '终端操作', value: 'terminal' },
  { label: '文件管理', value: 'file' }
]

const viewAgent = (agent: any) => {
  message.info(`查看智能体: ${agent.name}`)
}

const editAgent = (agent: any) => {
  message.info(`编辑智能体: ${agent.name}`)
}

const deleteAgent = (agent: any) => {
  dialog.error({
    title: '确认删除',
    content: `确定删除智能体 "${agent.name}" 吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      message.success('删除成功')
    }
  })
}

const createAgent = () => {
  if (!createForm.value.name) {
    message.error('请输入智能体名称')
    return
  }
  message.success('智能体创建成功')
  showCreateModal.value = false
}
</script>

<style scoped>
.agents-page {
  max-width: 1200px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agent-card {
  text-align: center;
}

.agent-avatar {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}

.agent-name {
  margin: 0;
  font-size: 18px;
}

.agent-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  margin: 8px 0;
}
</style>