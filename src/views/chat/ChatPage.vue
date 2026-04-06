<template>
  <div class="chat-page">
    <n-grid :cols="24" :x-gap="0">
      <n-gi :span="6">
        <n-card class="sessions-panel" :bordered="false">
          <template #header>
            <div class="panel-header">
              <span>会话列表</span>
              <n-button quaternary circle size="small" @click="newSession">
                <template #icon><n-icon><AddOutline /></n-icon></template>
              </n-button>
            </div>
          </template>
          <n-input v-model:value="searchSession" placeholder="搜索会话..." clearable size="small" style="margin-bottom: 12px">
            <template #prefix><n-icon><SearchOutline /></n-icon></template>
          </n-input>
          <n-list hoverable clickable>
            <n-list-item 
              v-for="session in sessions" 
              :key="session.id"
              :class="{ 'active-session': activeSession === session.id }"
              @click="activeSession = session.id"
            >
              <n-thing>
                <template #header>{{ session.title }}</template>
                <template #description>
                  <span class="session-meta">
                    {{ session.platform }} · {{ session.time }}
                  </span>
                </template>
              </n-thing>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>
      <n-gi :span="18">
        <n-card class="chat-panel" :bordered="false">
          <div class="chat-messages" ref="messagesRef">
            <div v-for="msg in messages" :key="msg.id" :class="['message', msg.role]">
              <div class="message-avatar">
                <n-avatar v-if="msg.role === 'user'" round>U</n-avatar>
                <n-avatar v-else round style="background: linear-gradient(135deg, #63e6be, #1a7f64)">H</n-avatar>
              </div>
              <div class="message-content">
                <div class="message-header">
                  <span class="message-role">{{ msg.role === 'user' ? '用户' : 'Hermes' }}</span>
                  <span class="message-time">{{ msg.time }}</span>
                </div>
                <div class="message-text" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
          </div>
          <div class="chat-input">
            <n-input 
              v-model:value="inputMessage"
              type="textarea"
              placeholder="输入消息，按 Enter 发送，Shift+Enter 换行..."
              :autosize="{ minRows: 1, maxRows: 4 }"
              @keydown="handleKeydown"
            />
            <n-button type="primary" circle @click="sendMessage" :disabled="!inputMessage.trim()">
              <template #icon><n-icon><SendOutline /></n-icon></template>
            </n-button>
          </div>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useMessage } from 'naive-ui'
import { AddOutline, SearchOutline, SendOutline } from '@vicons/ionicons5'

const message = useMessage()
const searchSession = ref('')
const activeSession = ref('1')
const inputMessage = ref('')
const messagesRef = ref()

const sessions = ref([
  { id: '1', title: 'GitHub 项目管理', platform: 'Telegram', time: '10:30' },
  { id: '2', title: '公众号文章整理', platform: '飞书', time: '09:15' },
  { id: '3', title: '技能开发讨论', platform: 'Web', time: '昨天' },
  { id: '4', title: '数据分析任务', platform: 'Telegram', time: '3天前' }
])

const messages = ref([
  { id: 1, role: 'user', content: '帮我看看最近仓库的动态', time: '10:30' },
  { id: 2, role: 'assistant', content: '我来帮你检查 GitHub 仓库的最近活动...', time: '10:30' },
  { id: 3, role: 'assistant', content: '**最近的仓库活动：**\n\n- `wk-Auto-update`: 最新提交 2 小时前\n- `hermes-agent-dashboard`: 刚刚创建\n- 有 3 个待处理的 PR\n\n需要我帮你处理哪个？', time: '10:31' },
  { id: 4, role: 'user', content: '查看 PR 详情', time: '10:32' },
  { id: 5, role: 'assistant', content: '好的，正在获取 PR 详情...', time: '10:32' }
])

const renderMarkdown = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
             .replace(/`(.*?)`/g, '<code>$1</code>')
             .replace(/\n/g, '<br>')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const sendMessage = () => {
  if (!inputMessage.value.trim()) return
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: inputMessage.value,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  })
  inputMessage.value = ''
  nextTick(() => {
    messagesRef.value?.scrollTo({ top: messagesRef.value.scrollHeight, behavior: 'smooth' })
  })
}

const newSession = () => {
  message.info('新建会话')
}
</script>

<style scoped>
.chat-page {
  height: calc(100vh - 112px);
}

.sessions-panel {
  height: 100%;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.active-session {
  background: rgba(99, 230, 190, 0.1);
  border-radius: 8px;
}

.chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.message.user .message-content {
  background: linear-gradient(135deg, #63e6be, #1a7f64);
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.message-role {
  font-size: 12px;
  font-weight: 600;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
}

.chat-input {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 16px;
}
</style>