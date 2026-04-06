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
              v-for="session in filteredSessions" 
              :key="session.id"
              :class="{ 'active-session': activeSession === session.id }"
              @click="selectSession(session.id)"
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
            <n-button type="primary" circle @click="sendMessage" :loading="isSending" :disabled="!inputMessage.trim()">
              <template #icon><n-icon v-if="!isSending"><SendOutline /></n-icon></template>
            </n-button>
          </div>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { AddOutline, SearchOutline, SendOutline } from '@vicons/ionicons5'

const messageApi = useMessage()
const searchSession = ref('')
const activeSession = ref('')
const inputMessage = ref('')
const messagesRef = ref<HTMLElement>()
const isSending = ref(false)

const sessions = ref<{ id: string; title: string; platform: string; time: string }[]>([])
const messages = ref<{ id: string | number; role: string; content: string; time: string }[]>([])

// Filtered sessions based on search
const filteredSessions = computed(() => {
  if (!searchSession.value) return sessions.value
  const q = searchSession.value.toLowerCase()
  return sessions.value.filter(s => 
    s.title.toLowerCase().includes(q) || s.platform.toLowerCase().includes(q)
  )
})

// Simple markdown renderer
const renderMarkdown = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
             .replace(/`(.*?)`/g, '<code>$1</code>')
             .replace(/\n/g, '<br>')
}

const getTimestamp = () => {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// Auto-scroll to bottom whenever messages change
watch(messages, () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}, { deep: true })

// ---- API: Load session list ----
const loadSessions = async () => {
  try {
    const resp = await fetch('/api/sessions')
    if (!resp.ok) throw new Error(`Failed to load sessions (${resp.status})`)
    const data = await resp.json()
    sessions.value = (Array.isArray(data) ? data : (data.sessions ?? [])).map((s: any) => ({
      id: s.id ?? s.sessionId ?? String(Math.random()),
      title: s.title ?? s.name ?? '未命名会话',
      platform: s.platform ?? s.source ?? 'Web',
      time: s.updatedAt ?? s.time ?? getTimestamp()
    }))
  } catch (err: any) {
    console.error('loadSessions error:', err)
    messageApi.error('加载会话列表失败')
    sessions.value = []
  }
}

// ---- API: Load messages for a session ----
const loadMessages = async (sessionId: string) => {
  try {
    const resp = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`)
    if (!resp.ok) throw new Error(`Failed to load messages (${resp.status})`)
    const data = await resp.json()
    const msgArr = Array.isArray(data) ? data : (data.messages ?? [])
    messages.value = msgArr.map((m: any, idx: number) => ({
      id: m.id ?? idx + 1,
      role: m.role ?? 'assistant',
      content: m.content ?? m.text ?? '',
      time: m.time ?? m.createdAt ?? getTimestamp()
    }))
  } catch (err: any) {
    console.error('loadMessages error:', err)
    messageApi.error('加载消息失败')
    messages.value = []
  }
}

// ---- Select a session ----
const selectSession = async (sessionId: string) => {
  activeSession.value = sessionId
  messages.value = []
  await loadMessages(sessionId)
}

// ---- API: Send a message ----
const sendMessage = async () => {
  const text = inputMessage.value.trim()
  if (!text || !activeSession.value || isSending.value) return

  // Optimistically show user message
  const userMsg = {
    id: Date.now(),
    role: 'user' as const,
    content: text,
    time: getTimestamp()
  }
  messages.value.push(userMsg)
  inputMessage.value = ''

  isSending.value = true

  try {
    const resp = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: activeSession.value, message: text })
    })
    if (!resp.ok) throw new Error(`Send failed (${resp.status})`)

    const data = await resp.json()

    // Support both shape: { id, role, content } and { message: { ... } } and { reply: ... }
    const replyId = data.id ?? data.message?.id ?? Date.now() + 1
    const replyRole = data.role ?? data.message?.role ?? 'assistant'
    const replyContent = data.content ?? data.message?.content ?? data.reply ?? data.text ?? '（无回复）'

    messages.value.push({
      id: replyId,
      role: replyRole,
      content: replyContent,
      time: getTimestamp()
    })
  } catch (err: any) {
    console.error('sendMessage error:', err)
    messageApi.error('发送消息失败')
  } finally {
    isSending.value = false
  }
}

// ---- Keyboard handler ----
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// ---- Create new session ----
const newSession = async () => {
  try {
    const resp = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    if (!resp.ok) throw new Error(`Create session failed (${resp.status})`)
    const data = await resp.json()
    const newId = data.id ?? data.sessionId ?? String(Date.now())
    // Refresh session list then select new session
    await loadSessions()
    await selectSession(newId)
    messageApi.success('已创建新会话')
  } catch (err: any) {
    console.error('newSession error:', err)
    // Fallback: create a local session entry
    const fallbackId = String(Date.now())
    sessions.value.unshift({
      id: fallbackId,
      title: '新会话',
      platform: 'Web',
      time: getTimestamp()
    })
    await selectSession(fallbackId)
  }
}

// ---- Initial load ----
onMounted(async () => {
  await loadSessions()
  if (sessions.value.length > 0) {
    await selectSession(sessions.value[0].id)
  }
})
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