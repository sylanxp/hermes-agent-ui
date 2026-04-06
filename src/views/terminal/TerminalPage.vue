<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NFormItem,
  NIcon,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NTag,
  NText,
  NSpin,
  useMessage,
} from 'naive-ui'
import {
  PlayOutline,
  StopOutline,
  ExpandOutline,
  ContractOutline,
  TerminalOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import { useTerminalStore } from '@/stores/terminal'

const message = useMessage()
const terminalStore = useTerminalStore()

const terminalContainerRef = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)
const showFullscreenHint = ref(false)
const nodesLoading = ref(false)
const nodes = ref<Array<{ id: string; name: string }>>([])
const selectedNodeId = ref<string | null>(null)
const shellInput = ref('')
const cwdInput = ref('')
const colsInput = ref(120)
const rowsInput = ref(36)
const timeoutInput = ref(60)
const showSettings = ref(false)
const terminalLoading = ref(true)
const terminalError = ref<string | null>(null)

const terminal = shallowRef<any>(null)
const fitAddon = shallowRef<any>(null)
const resizeObserver = shallowRef<ResizeObserver | null>(null)

const connectionTagType = computed<'success' | 'warning' | 'error' | 'default'>(() => {
  if (terminalStore.isConnected) return 'success'
  if (terminalStore.isConnecting) return 'warning'
  if (terminalStore.hasError) return 'error'
  return 'default'
})

const connectionLabel = computed(() => {
  if (terminalStore.isConnected) return '已连接'
  if (terminalStore.isConnecting) return '连接中...'
  if (terminalStore.hasError) return '连接错误'
  return '未连接'
})

const nodeOptions = computed(() =>
  nodes.value.map((node) => ({
    label: `${node.name} (${node.id})`,
    value: node.id,
  }))
)

async function loadNodes() {
  if (nodesLoading.value) return
  nodesLoading.value = true
  try {
    const res = await fetch('/api/nodes')
    if (res.ok) {
      nodes.value = await res.json()
    }
  } catch {
    nodes.value = []
  } finally {
    nodesLoading.value = false
  }
}

async function initTerminal() {
  if (!terminalContainerRef.value) return

  terminalLoading.value = true
  terminalError.value = null

  try {
    const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
      import('@xterm/addon-web-links'),
    ])

    if (terminal.value) {
      terminal.value.dispose()
    }

    terminal.value = new Terminal({
      fontSize: 14,
      fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      allowTransparency: true,
      cols: colsInput.value,
      rows: rowsInput.value,
    })

    fitAddon.value = new FitAddon()
    terminal.value.loadAddon(fitAddon.value)
    terminal.value.loadAddon(new WebLinksAddon())

    terminal.value.open(terminalContainerRef.value)

    setTimeout(() => {
      fitAddon.value?.fit()
    }, 100)

    terminal.value.onData((data: string) => {
      if (data === '\x1b' && isFullscreen.value) {
        isFullscreen.value = false
        return
      }
      if (terminalStore.isConnected) {
        terminalStore.sendInput(data)
      }
    })

    terminal.value.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      if (terminalStore.isConnected) {
        terminalStore.resize(cols, rows)
      }
    })

    terminal.value.onSelectionChange(() => {
      const selection = terminal.value?.getSelection()
      if (selection) {
        navigator.clipboard.writeText(selection).then(() => {
          message.success('已复制到剪贴板', { duration: 1500 })
        }).catch(() => {
          // Ignore copy errors
        })
      }
    })

    terminalStore.onOutput((data: string) => {
      if (terminal.value) {
        terminal.value.write(data)
      }
    })

    terminalStore.onConnected((sessionId: string) => {
      terminal.value?.write('\x1b[32m✓ 已连接到终端\x1b[0m\r\n')
      terminal.value?.write(`\x1b[36m会话: ${sessionId.slice(0, 8)}...\x1b[0m\r\n\r\n`)
    })

    terminalStore.onDisconnected(() => {
      terminal.value?.write('\r\n\x1b[33m⚠ 连接已关闭\x1b[0m\r\n')
    })

    terminalContainerRef.value.addEventListener('contextmenu', async (e: MouseEvent) => {
      e.preventDefault()
      if (!terminalStore.isConnected) return

      try {
        const text = await navigator.clipboard.readText()
        if (text) {
          terminalStore.sendInput(text)
          message.success('已粘贴', { duration: 1500 })
        }
      } catch {
        // Ignore paste errors
      }
    })

    resizeObserver.value = new ResizeObserver(() => {
      fitAddon.value?.fit()
    })
    resizeObserver.value.observe(terminalContainerRef.value)

    terminalLoading.value = false
  } catch (e) {
    terminalLoading.value = false
    terminalError.value = e instanceof Error ? e.message : '终端初始化失败'
    console.error('Terminal init error:', e)
  }
}

function handleConnect() {
  if (terminalStore.isConnected) {
    terminalStore.disconnect()
    terminal.value?.write('\x1b[33m正在断开连接...\x1b[0m\r\n')
  } else {
    terminalStore.setConfig({
      cols: colsInput.value,
      rows: rowsInput.value,
      cwd: cwdInput.value || undefined,
      shell: shellInput.value || undefined,
      timeout: timeoutInput.value,
    })
    terminal.value?.write('\x1b[33m正在连接...\x1b[0m\r\n')
    terminalStore.connect(selectedNodeId.value || undefined)
  }
}

function handleClear() {
  terminal.value?.clear()
}

function handleFullscreen() {
  isFullscreen.value = !isFullscreen.value

  if (isFullscreen.value) {
    showFullscreenHint.value = true
    setTimeout(() => {
      showFullscreenHint.value = false
    }, 3000)
  }

  nextTick(() => {
    setTimeout(() => {
      fitAddon.value?.fit()
    }, 100)
  })
}

function handleTerminalResize() {
  fitAddon.value?.fit()
}

watch(isFullscreen, () => {
  nextTick(() => {
    setTimeout(() => {
      fitAddon.value?.fit()
    }, 100)
  })
})

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  }
}

onMounted(() => {
  loadNodes()
  initTerminal()
  window.addEventListener('resize', handleTerminalResize)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleTerminalResize)
  window.removeEventListener('keydown', handleKeyDown)
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  }
  if (terminalStore.isConnected) {
    terminalStore.disconnect()
  }
  if (terminal.value) {
    terminal.value.dispose()
  }
})
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="终端" class="app-card">
      <template #header-extra>
        <NSpace :size="8" align="center">
          <NButton size="small" class="app-toolbar-btn" @click="showSettings = !showSettings">
            <template #icon><NIcon :component="TerminalOutline" /></template>
            设置
          </NButton>
          <NButton size="small" class="app-toolbar-btn" @click="handleClear">
            <template #icon><NIcon :component="RefreshOutline" /></template>
            清屏
          </NButton>
          <NButton size="small" class="app-toolbar-btn" @click="handleFullscreen">
            <template #icon>
              <NIcon :component="isFullscreen ? ContractOutline : ExpandOutline" />
            </template>
            {{ isFullscreen ? '退出全屏' : '全屏' }}
          </NButton>
          <NButton
            :type="terminalStore.isConnected ? 'error' : 'primary'"
            size="small"
            class="app-toolbar-btn"
            @click="handleConnect"
          >
            <template #icon>
              <NIcon :component="terminalStore.isConnected ? StopOutline : PlayOutline" />
            </template>
            {{ terminalStore.isConnected ? '断开' : '连接' }}
          </NButton>
        </NSpace>
      </template>

      <NSpace :size="12" align="center" style="flex-wrap: wrap; margin-bottom: 12px;">
        <NTag :type="connectionTagType" :bordered="false" round>
          {{ connectionLabel }}
        </NTag>
        <NTag v-if="terminalStore.currentSession" type="info" :bordered="false" round>
          会话: {{ terminalStore.currentSession.id.slice(0, 8) }}...
        </NTag>
        <NTag v-if="selectedNodeId" :bordered="false" round>
          节点: {{ selectedNodeId }}
        </NTag>
        <NText depth="3" style="font-size: 12px;">
          尺寸: {{ terminalStore.config.cols }}x{{ terminalStore.config.rows }}
        </NText>
      </NSpace>

      <NAlert
        v-if="terminalStore.error"
        type="error"
        :bordered="false"
        style="margin-bottom: 12px;"
      >
        {{ terminalStore.error }}
      </NAlert>

      <NCard v-if="showSettings" size="small" embedded class="terminal-settings-card">
        <NSpace :size="12" :wrap="true">
          <div style="min-width: 180px;">
            <NFormItem label="节点" :show-feedback="false">
              <NSelect
                v-model:value="selectedNodeId"
                :options="nodeOptions"
                :loading="nodesLoading"
                placeholder="选择节点（可选）"
                clearable
                filterable
                size="small"
              />
            </NFormItem>
          </div>
          <div style="min-width: 150px;">
            <NFormItem label="Shell" :show-feedback="false">
              <NInput
                v-model:value="shellInput"
                placeholder="/bin/bash"
                clearable
                size="small"
              />
            </NFormItem>
          </div>
          <div style="min-width: 180px;">
            <NFormItem label="工作目录" :show-feedback="false">
              <NInput
                v-model:value="cwdInput"
                placeholder="~"
                clearable
                size="small"
              />
            </NFormItem>
          </div>
          <div style="min-width: 80px;">
            <NFormItem label="列数" :show-feedback="false">
              <NInputNumber v-model:value="colsInput" :min="20" :max="300" size="small" />
            </NFormItem>
          </div>
          <div style="min-width: 80px;">
            <NFormItem label="行数" :show-feedback="false">
              <NInputNumber v-model:value="rowsInput" :min="5" :max="100" size="small" />
            </NFormItem>
          </div>
          <div style="min-width: 120px;">
            <NFormItem label="超时" :show-feedback="false">
              <NInputNumber v-model:value="timeoutInput" :min="10" :max="600" size="small">
                <template #suffix>
                  <NText depth="3" style="font-size: 12px;">秒</NText>
                </template>
              </NInputNumber>
            </NFormItem>
          </div>
        </NSpace>
        <NText depth="3" style="font-size: 12px; display: block; margin-top: 8px;">
          提示：右键粘贴，选中自动复制
        </NText>
      </NCard>
    </NCard>

    <NCard
      class="app-card terminal-container"
      :class="{ 'terminal-container--fullscreen': isFullscreen }"
    >
      <div v-if="isFullscreen && showFullscreenHint" class="fullscreen-hint">
        按 ESC 退出全屏
      </div>
      <NSpin :show="terminalLoading">
        <NAlert
          v-if="terminalError"
          type="error"
          :bordered="false"
          style="margin-bottom: 12px;"
        >
          {{ terminalError }}
        </NAlert>
        <div ref="terminalContainerRef" class="terminal-xterm-wrapper"></div>
      </NSpin>
    </NCard>

    <NCard class="app-card">
      <NText depth="3" style="font-size: 12px;">
        提示：选中文字自动复制，右键粘贴。按 ESC 退出全屏模式。
      </NText>
    </NCard>
  </NSpace>
</template>

<style>
@import '@xterm/xterm/css/xterm.css';

.terminal-settings-card {
  margin-bottom: 12px;
  border-radius: 12px;
}

.terminal-container {
  position: relative;
}

.terminal-container--fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
}

.terminal-container--fullscreen :deep(.n-card__content) {
  padding: 0;
  height: 100%;
}

.fullscreen-hint {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  z-index: 10;
  pointer-events: none;
  animation: fadeInOut 3s ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

.terminal-xterm-wrapper {
  height: calc(100vh - 380px);
  min-height: 300px;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 8px;
}

.terminal-container--fullscreen .terminal-xterm-wrapper {
  height: 100vh;
  border-radius: 0;
}

.terminal-xterm-wrapper .xterm {
  height: 100%;
}

.terminal-xterm-wrapper .xterm-viewport {
  border-radius: 4px;
}

@media (max-width: 768px) {
  .terminal-xterm-wrapper {
    height: calc(100vh - 450px);
    min-height: 250px;
  }
}
</style>
