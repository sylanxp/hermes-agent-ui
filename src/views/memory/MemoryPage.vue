<template>
  <div class="memory-page">
    <n-grid :cols="3" :x-gap="16" :y-gap="16">
      <n-gi>
        <n-card title="用户画像 (User Profile)" class="memory-card">
          <template #header-extra>
            <n-button size="small" @click="addMemoryEntry('user')">
              <template #icon><n-icon><AddOutline /></n-icon></template>
            </n-button>
          </template>
          <n-spin :show="loading">
            <n-list bordered v-if="userEntries.length">
              <n-list-item v-for="(item, idx) in userEntries" :key="`user-${idx}`">
                <template #prefix>
                  <n-tag type="success" size="small">{{ item.target }}</n-tag>
                </template>
                <n-thing :title="item.content">
                  <template #description>
                    <span class="memory-time">{{ formatTime(item.timestamp || item.added) }}</span>
                  </template>
                </n-thing>
                <template #suffix>
                  <n-button quaternary circle size="small" @click="editMemoryEntry(item)">
                    <template #icon><n-icon><CreateOutline /></n-icon></template>
                  </n-button>
                </template>
              </n-list-item>
            </n-list>
            <n-empty v-else description="暂无用户记忆数据" />
          </n-spin>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="智能体记忆 (Agent Memory)" class="memory-card">
          <template #header-extra>
            <n-button size="small" @click="addMemoryEntry('memory')">
              <template #icon><n-icon><AddOutline /></n-icon></template>
            </n-button>
          </template>
          <n-spin :show="loading">
            <n-list bordered v-if="memoryEntries.length">
              <n-list-item v-for="(item, idx) in memoryEntries" :key="`memory-${idx}`">
                <template #prefix>
                  <n-tag type="info" size="small">{{ item.target }}</n-tag>
                </template>
                <n-thing :title="item.content">
                  <template #description>
                    <span class="memory-time">{{ formatTime(item.timestamp || item.added) }}</span>
                  </template>
                </n-thing>
                <template #suffix>
                  <n-button quaternary circle size="small" @click="editMemoryEntry(item)">
                    <template #icon><n-icon><CreateOutline /></n-icon></template>
                  </n-button>
                </template>
              </n-list-item>
            </n-list>
            <n-empty v-else description="暂无智能体记忆数据" />
          </n-spin>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="环境信息 (Environment)" class="memory-card">
          <n-spin :show="envLoading">
            <n-descriptions :column="1" label-placement="left">
              <n-descriptions-item label="HERMES_HOME">{{ envInfo.hermesHome || '-' }}</n-descriptions-item>
              <n-descriptions-item label="运行时间">{{ envInfo.uptime || '-' }}</n-descriptions-item>
              <n-descriptions-item label="内存">{{ envInfo.memoryUsage || '-' }}</n-descriptions-item>
              <n-descriptions-item label="磁盘">{{ envInfo.diskUsage || '-' }}</n-descriptions-item>
            </n-descriptions>
          </n-spin>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 编辑/添加记忆抽屉 -->
    <n-drawer v-model:show="showEditDrawer" :width="500" placement="right">
      <n-drawer-content :title="editForm.isNew ? '添加记忆' : '编辑记忆'" closable>
        <n-form :model="editForm" label-placement="left" label-width="60">
          <n-form-item label="类型">
            <n-tag type="info">{{ editForm.target }}</n-tag>
          </n-form-item>
          <n-form-item label="内容">
            <n-input v-model:value="editForm.content" type="textarea" :rows="6" placeholder="记忆内容" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space>
            <n-button v-if="!editForm.isNew && editForm.id" type="error" :loading="deleting" @click="deleteMemoryEntry">删除</n-button>
            <n-space style="margin-left: auto">
              <n-button @click="showEditDrawer = false">取消</n-button>
              <n-button type="primary" :loading="saving" @click="saveMemoryEntry">保存</n-button>
            </n-space>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { AddOutline, CreateOutline } from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const envLoading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const showEditDrawer = ref(false)

interface MemoryEntry {
  target: string
  content: string
  timestamp?: string
  added?: number | string
  sourceFile?: string
  _index?: number
  id?: string
}

const userEntries = ref<MemoryEntry[]>([])
const memoryEntries = ref<MemoryEntry[]>([])
const envInfo = ref({
  hermesHome: '',
  uptime: '',
  memoryUsage: '',
  diskUsage: ''
})

const editForm = ref<{
  target: string
  content: string
  isNew: boolean
  id?: string
  oldContent?: string
  sourceFile?: string
  _index?: number
}>({
  target: '',
  content: '',
  isNew: false
})

async function loadMemories() {
  loading.value = true
  try {
    const res = await fetch('/api/memories')
    const data = await res.json()
    userEntries.value = (data.user || []).map((e: MemoryEntry, i: number) => ({
      ...e,
      _index: i,
      id: `${e.sourceFile}:${i}`
    }))
    memoryEntries.value = (data.memory || []).map((e: MemoryEntry, i: number) => ({
      ...e,
      _index: i,
      id: `${e.sourceFile}:${i}`
    }))
  } catch (e) {
    message.error('加载记忆失败')
  } finally {
    loading.value = false
  }
}

async function loadEnvInfo() {
  envLoading.value = true
  try {
    const res = await fetch('/api/system')
    const data = await res.json()
    envInfo.value = {
      hermesHome: '',
      uptime: data.uptime || 'N/A',
      memoryUsage: data.memory ? `${data.memory.used}MB / ${data.memory.total}MB (${data.memoryPercent}%)` : 'N/A',
      diskUsage: data.disk ? `${data.disk.used} / ${data.disk.total} (${data.diskPercent}%)` : 'N/A'
    }
  } catch (e) {
    envInfo.value = { hermesHome: 'N/A', uptime: 'N/A', memoryUsage: 'N/A', diskUsage: 'N/A' }
  } finally {
    envLoading.value = false
  }
}

function formatTime(ts: string | number | undefined): string {
  if (!ts) return '-'
  const d = typeof ts === 'string' ? new Date(ts) : ts > 1e9 ? new Date(ts * 1000) : new Date(ts)
  return d.toLocaleString('zh-CN')
}

function addMemoryEntry(target: string) {
  editForm.value = { target, content: '', isNew: true }
  showEditDrawer.value = true
}

function editMemoryEntry(item: MemoryEntry) {
  editForm.value = {
    target: item.target,
    content: item.content,
    isNew: false,
    id: item.id,
    oldContent: item.content,
    sourceFile: item.sourceFile,
    _index: item._index
  }
  showEditDrawer.value = true
}

async function saveMemoryEntry() {
  if (!editForm.value.content.trim()) {
    message.warning('内容不能为空')
    return
  }
  saving.value = true
  try {
    if (editForm.value.isNew) {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: editForm.value.target, content: editForm.value.content })
      })
      if (!res.ok) throw new Error('Failed')
      message.success('添加成功')
    } else {
      const id = editForm.value.id || `${editForm.value.sourceFile}:${editForm.value._index}`
      const res = await fetch(`/api/memories/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editForm.value.content, old_content: editForm.value.oldContent })
      })
      if (!res.ok) throw new Error('Failed')
      message.success('更新成功')
    }
    showEditDrawer.value = false
    await loadMemories()
  } catch (e) {
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteMemoryEntry() {
  if (!editForm.value.id) return
  dialog.warning({
    title: '确认删除',
    content: '删除后无法恢复，确定继续吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      deleting.value = true
      try {
        const res = await fetch(`/api/memories/${encodeURIComponent(editForm.value.id!)}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed')
        message.success('删除成功')
        showEditDrawer.value = false
        await loadMemories()
      } catch (e) {
        message.error('删除失败')
      } finally {
        deleting.value = false
      }
    }
  })
}

onMounted(() => {
  loadMemories()
  loadEnvInfo()
})
</script>

<style scoped>
.memory-page { max-width: 1400px; }
.memory-card { height: 100%; }
.memory-time { font-size: 12px; color: rgba(255, 255, 255, 0.4); }
</style>
