<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import {
  NCard, NButton, NIcon, NSpace, NEmpty, NSpin, NAlert, NText, NDataTable,
  NBreadcrumb, NBreadcrumbItem, NTooltip, NPopconfirm, NModal, NInput, NForm, NFormItem,
  useMessage, type DataTableColumns,
} from 'naive-ui'
import {
  RefreshOutline, FolderOutline, DocumentOutline, HomeOutline,
  CreateOutline, TrashOutline, AddOutline, CloudUploadOutline, CloudDownloadOutline,
} from '@vicons/ionicons5'
import { useFilesStore, type FileEntry } from '@/stores/files'

const message = useMessage()
const filesStore = useFilesStore()

const selectedFile = ref<FileEntry | null>(null)
const fileContent = ref('')
const fileLoading = ref(false)
const showPreview = ref(false)
const showEditor = ref(false)
const editedContent = ref('')
const showCreateModal = ref(false)
const createName = ref('')
const createType = ref<'file' | 'directory'>('file')

// 图片和代码扩展名
const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp']
const codeExts = ['ts', 'tsx', 'js', 'jsx', 'vue', 'json', 'yaml', 'yml', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'html', 'xml', 'sh', 'bash', 'md']

const isImageFile = computed(() => {
  if (!selectedFile.value) return false
  const ext = selectedFile.value.extension?.toLowerCase() || ''
  return imgExts.includes(ext)
})

const isCodeFile = computed(() => {
  if (!selectedFile.value) return false
  const ext = selectedFile.value.extension?.toLowerCase() || ''
  return codeExts.includes(ext)
})

function formatSize(size?: number): string {
  if (!size) return '-'
  if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + ' MB'
  if (size >= 1024) return (size / 1024).toFixed(1) + ' KB'
  return size + ' B'
}

function formatTime(time?: string): string {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

const columns: DataTableColumns<FileEntry> = [
  {
    title: '名称',
    key: 'name',
    render(row) {
      const icon = row.type === 'directory' ? FolderOutline : DocumentOutline
      const color = row.type === 'directory' ? '#f0a020' : '#2080f0'
      return h(NSpace, { align: 'center', size: 8 }, () => [
        h(NIcon, { component: icon, color, size: 18 }),
        h('span', row.name),
      ])
    },
  },
  { title: '大小', key: 'size', width: 100, render: (row) => formatSize(row.size) },
  { title: '修改时间', key: 'modifiedAt', width: 180, render: (row) => formatTime(row.modifiedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render(row) {
      return h(NSpace, { size: 4 }, () => [
        h(NTooltip, null, {
          trigger: () => h(NButton, {
            size: 'tiny', quaternary: true,
            onClick: () => handleOpen(row),
          }, { icon: () => h(NIcon, { component: row.type === 'directory' ? FolderOutline : DocumentOutline }) }),
          default: () => row.type === 'directory' ? '打开' : '查看',
        }),
        h(NTooltip, null, {
          trigger: () => h(NButton, {
            size: 'tiny', quaternary: true,
            onClick: () => handleDownload(row),
          }, { icon: () => h(NIcon, { component: CloudDownloadOutline }) }),
          default: () => '下载',
        }),
        h(NPopconfirm, { onPositiveClick: () => handleDelete(row) }, {
          trigger: () => h(NButton, { size: 'tiny', quaternary: true, type: 'error' }, { icon: () => h(NIcon, { component: TrashOutline }) }),
          default: () => '确定删除？',
        }),
      ])
    },
  },
]

const pathParts = computed(() => {
  const parts = filesStore.currentPath.split('/').filter(Boolean)
  const result = [{ name: '根目录', path: '/' }]
  let acc = ''
  for (const p of parts) {
    acc += '/' + p
    result.push({ name: p, path: acc })
  }
  return result
})

async function navigateTo(path: string) {
  await filesStore.listDirectory(path)
  selectedFile.value = null
}

async function handleOpen(row: FileEntry) {
  if (row.type === 'directory') {
    await navigateTo(row.path)
  } else {
    selectedFile.value = row
    if (isCodeFile.value) {
      fileLoading.value = true
      try {
        fileContent.value = await filesStore.readFile(row.path)
        showPreview.value = true
      } catch (e) {
        message.error('读取文件失败')
      } finally {
        fileLoading.value = false
      }
    } else if (isImageFile.value) {
      showPreview.value = true
    } else {
      message.info('不支持预览此文件类型')
    }
  }
}

async function handleDownload(row: FileEntry) {
  const url = `/api/files/download?path=${encodeURIComponent(row.path)}`
  const a = document.createElement('a')
  a.href = url
  a.download = row.name
  a.click()
}

async function handleDelete(row: FileEntry) {
  try {
    await filesStore.deleteFile(row.path)
    message.success('删除成功')
    await filesStore.listDirectory(filesStore.currentPath)
  } catch {
    message.error('删除失败')
  }
}

function openCreateModal(type: 'file' | 'directory') {
  createType.value = type
  createName.value = ''
  showCreateModal.value = true
}

async function handleCreate() {
  if (!createName.value.trim()) {
    message.warning('请输入名称')
    return
  }
  const path = filesStore.currentPath === '/' 
    ? '/' + createName.value 
    : filesStore.currentPath + '/' + createName.value
  try {
    await filesStore.createFile(path, createType.value)
    message.success('创建成功')
    showCreateModal.value = false
    await filesStore.listDirectory(filesStore.currentPath)
  } catch {
    message.error('创建失败')
  }
}

function goUp() {
  const parts = filesStore.currentPath.split('/').filter(Boolean)
  parts.pop()
  navigateTo('/' + parts.join('/') || '/')
}

onMounted(() => {
  filesStore.listDirectory('/')
})
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="文件管理" class="app-card">
      <template #header-extra>
        <NSpace :size="8">
          <NButton size="small" @click="openCreateModal('file')">
            <template #icon><NIcon :component="AddOutline" /></template>
            新建文件
          </NButton>
          <NButton size="small" @click="openCreateModal('directory')">
            <template #icon><NIcon :component="FolderOutline" /></template>
            新建文件夹
          </NButton>
          <NButton size="small" @click="goUp" :disabled="filesStore.currentPath === '/'">
            <template #icon><NIcon :component="HomeOutline" /></template>
            上级
          </NButton>
          <NButton size="small" @click="filesStore.listDirectory(filesStore.currentPath)">
            <template #icon><NIcon :component="RefreshOutline" /></template>
            刷新
          </NButton>
        </NSpace>
      </template>

      <NBreadcrumb>
        <NBreadcrumbItem v-for="p in pathParts" :key="p.path">
          <NButton text size="tiny" @click="navigateTo(p.path)">{{ p.name }}</NButton>
        </NBreadcrumbItem>
      </NBreadcrumb>

      <NAlert v-if="filesStore.error" type="error" style="margin-top: 12px;">
        {{ filesStore.error }}
      </NAlert>
    </NCard>

    <NCard class="app-card">
      <NSpin :show="filesStore.loading">
        <NDataTable
          :columns="columns"
          :data="filesStore.entries"
          :bordered="false"
          :row-key="(row: FileEntry) => row.path"
          striped
          size="small"
        />
        <NEmpty v-if="!filesStore.loading && filesStore.entries.length === 0" description="空目录" style="margin-top: 24px;" />
      </NSpin>
    </NCard>

    <!-- 预览弹窗 -->
    <NModal v-model:show="showPreview" preset="card" title="文件预览" style="width: 800px; max-width: 95vw;">
      <NSpin :show="fileLoading">
        <div v-if="isImageFile && selectedFile" class="preview-image">
          <img :src="`/api/files/download?path=${encodeURIComponent(selectedFile.path)}`" style="max-width: 100%;" />
        </div>
        <pre v-else-if="isCodeFile" class="preview-code">{{ fileContent }}</pre>
        <NEmpty v-else description="无法预览" />
      </NSpin>
    </NModal>

    <!-- 创建弹窗 -->
    <NModal v-model:show="showCreateModal" preset="card" :title="createType === 'file' ? '新建文件' : '新建文件夹'" style="width: 400px;">
      <NForm @submit.prevent="handleCreate">
        <NFormItem :label="createType === 'file' ? '文件名' : '文件夹名'">
          <NInput v-model:value="createName" placeholder="输入名称" @keyup.enter="handleCreate" />
        </NFormItem>
        <NSpace justify="end">
          <NButton @click="showCreateModal = false">取消</NButton>
          <NButton type="primary" @click="handleCreate">创建</NButton>
        </NSpace>
      </NForm>
    </NModal>
  </NSpace>
</template>

<style scoped>
.preview-image {
  text-align: center;
  padding: 16px;
}
.preview-code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  overflow: auto;
  max-height: 60vh;
  font-size: 13px;
  font-family: 'SF Mono', 'Menlo', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
