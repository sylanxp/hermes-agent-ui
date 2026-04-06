import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt?: string
  extension?: string
}

export const useFilesStore = defineStore('files', () => {
  const currentPath = ref('/')
  const entries = ref<FileEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function listDirectory(path: string) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`)
      if (!res.ok) throw new Error('获取文件列表失败')
      const data = await res.json()
      currentPath.value = path
      entries.value = data.entries || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : '未知错误'
      entries.value = []
    } finally {
      loading.value = false
    }
  }

  async function readFile(path: string): Promise<string> {
    const res = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`)
    if (!res.ok) throw new Error('读取文件失败')
    return await res.text()
  }

  async function writeFile(path: string, content: string) {
    const res = await fetch('/api/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    })
    if (!res.ok) throw new Error('写入文件失败')
  }

  async function createFile(path: string, type: 'file' | 'directory') {
    const res = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, type }),
    })
    if (!res.ok) throw new Error('创建失败')
  }

  async function deleteFile(path: string) {
    const res = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (!res.ok) throw new Error('删除失败')
  }

  async function renameFile(oldPath: string, newPath: string) {
    const res = await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    })
    if (!res.ok) throw new Error('重命名失败')
  }

  return {
    currentPath,
    entries,
    loading,
    error,
    listDirectory,
    readFile,
    writeFile,
    createFile,
    deleteFile,
    renameFile,
  }
})
