<template>
  <div class="memory-page">
    <n-grid :cols="3" :x-gap="16" :y-gap="16">
      <n-gi>
        <n-card title="用户画像 (User Profile)" class="memory-card">
          <template #header-extra>
            <n-button size="small" @click="addUserMemory">
              <template #icon><n-icon><AddOutline /></n-icon></template>
            </n-button>
          </template>
          <n-list bordered>
            <n-list-item v-for="item in userMemories" :key="item.id">
              <template #prefix>
                <n-tag :type="item.type" size="small">{{ item.key }}</n-tag>
              </template>
              <n-thing :title="item.value">
                <template #description>
                  <span class="memory-time">{{ item.time }}</span>
                </template>
              </n-thing>
              <template #suffix>
                <n-button quaternary circle size="small" @click="editMemory(item, 'user')">
                  <template #icon><n-icon><CreateOutline /></n-icon></template>
                </n-button>
              </template>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="智能体记忆 (Agent Memory)" class="memory-card">
          <template #header-extra>
            <n-button size="small" @click="addAgentMemory">
              <template #icon><n-icon><AddOutline /></n-icon></template>
            </n-button>
          </template>
          <n-list bordered>
            <n-list-item v-for="item in agentMemories" :key="item.id">
              <template #prefix>
                <n-tag type="info" size="small">{{ item.key }}</n-tag>
              </template>
              <n-thing :title="item.value">
                <template #description>
                  <span class="memory-time">{{ item.time }}</span>
                </template>
              </n-thing>
              <template #suffix>
                <n-button quaternary circle size="small" @click="editMemory(item, 'agent')">
                  <template #icon><n-icon><CreateOutline /></n-icon></template>
                </n-button>
              </template>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="环境信息 (Environment)" class="memory-card">
          <n-descriptions :column="1" label-placement="left">
            <n-descriptions-item v-for="env in environments" :key="env.label" :label="env.label">
              {{ env.value }}
            </n-descriptions-item>
          </n-descriptions>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 编辑记忆抽屉 -->
    <n-drawer v-model:show="showEditDrawer" :width="400" placement="right">
      <n-drawer-content title="编辑记忆" closable>
        <n-form :model="editForm" label-placement="left" label-width="60">
          <n-form-item label="类型">
            <n-tag>{{ editForm.target }}</n-tag>
          </n-form-item>
          <n-form-item label="键">
            <n-input v-model:value="editForm.key" :disabled="!editForm.isNew" />
          </n-form-item>
          <n-form-item label="值">
            <n-input v-model:value="editForm.value" type="textarea" :rows="4" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space>
            <n-button v-if="!editForm.isNew" type="error" @click="deleteMemory">删除</n-button>
            <n-button type="primary" @click="saveMemory">保存</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { AddOutline, CreateOutline } from '@vicons/ionicons5'

const message = useMessage()
const showEditDrawer = ref(false)

const editForm = ref({
  target: '',
  key: '',
  value: '',
  isNew: false
})

const userMemories = ref([
  { id: 1, key: 'name', value: '张三', type: 'success' as const, time: '2024-01-15' },
  { id: 2, key: 'language', value: '中文', type: 'info' as const, time: '2024-01-15' },
  { id: 3, key: 'timezone', value: 'Asia/Shanghai', type: 'warning' as const, time: '2024-01-20' },
  { id: 4, key: 'github', value: 'sylanxp', type: 'error' as const, time: '2024-02-01' }
])

const agentMemories = ref([
  { id: 1, key: 'model', value: 'gemini-2.5-pro', time: '2024-01-10' },
  { id: 2, key: 'provider', value: 'openrouter', time: '2024-01-10' },
  { id: 3, key: 'working_dir', value: '/home/user/workspace', time: '2024-01-12' }
])

const environments = ref([
  { label: '操作系统', value: 'Ubuntu 22.04 LTS' },
  { label: 'Python', value: '3.11.6' },
  { label: 'Node.js', value: '20.10.0' },
  { label: 'Git', value: '2.43.0' },
  { label: '内存使用', value: '8.2 GB / 16 GB' }
])

const addUserMemory = () => {
  editForm.value = { target: 'user', key: '', value: '', isNew: true }
  showEditDrawer.value = true
}

const addAgentMemory = () => {
  editForm.value = { target: 'agent', key: '', value: '', isNew: true }
  showEditDrawer.value = true
}

const editMemory = (item: any, target: string) => {
  editForm.value = { target, key: item.key, value: item.value, isNew: false }
  showEditDrawer.value = true
}

const saveMemory = () => {
  message.success('保存成功')
  showEditDrawer.value = false
}

const deleteMemory = () => {
  message.success('删除成功')
  showEditDrawer.value = false
}
</script>

<style scoped>
.memory-page {
  max-width: 1400px;
}

.memory-card {
  height: 100%;
}

.memory-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}
</style>