/**
 * WebSocket 服务 - 实时数据推送
 */

type MessageHandler = (data: any) => void

interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

class WebSocketService {
  private ws: WebSocket | null = null
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private isConnecting = false

  /**
   * 获取 WebSocket URL
   */
  private getWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    // 如果是开发环境，直接连接后端端口
    if (host.includes('5173') || host.includes('5174')) {
      return `${protocol}//localhost:3001`
    }
    return `${protocol}//${host}`
  }

  /**
   * 连接 WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true
    const url = this.getWsUrl()
    
    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log('📡 WebSocket 已连接')
        this.reconnectAttempts = 0
        this.isConnecting = false
      }

      this.ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(msg)
        } catch (e) {
          console.warn('WebSocket 消息解析失败:', e)
        }
      }

      this.ws.onclose = (event) => {
        console.log('📡 WebSocket 已断开', event.code, event.reason)
        this.isConnecting = false
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error)
        this.isConnecting = false
      }
    } catch (e) {
      console.error('WebSocket 连接失败:', e)
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 订阅消息类型
   */
  subscribe(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)

    // 返回取消订阅函数
    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(msg: WebSocketMessage): void {
    const handlers = this.handlers.get(msg.type)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(msg.data)
        } catch (e) {
          console.error(`消息处理器错误 [${msg.type}]:`, e)
        }
      })
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 3)
    
    console.log(`📡 WebSocket 将在 ${delay / 1000}s 后重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }
}

// 单例
export const wsService = new WebSocketService()

// Vue 组合式 API
import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export function useWebSocket() {
  return {
    connect: () => wsService.connect(),
    disconnect: () => wsService.disconnect(),
    subscribe: (type: string, handler: MessageHandler) => wsService.subscribe(type, handler)
  }
}

export function useRealtimeData<T>(eventType: string, initialValue: T): Ref<T> {
  const data = ref<T>(initialValue) as Ref<T>
  
  onMounted(() => {
    wsService.connect()
    const unsubscribe = wsService.subscribe(eventType, (newData: T) => {
      data.value = newData
    })
    
    onUnmounted(unsubscribe)
  })
  
  return data
}
