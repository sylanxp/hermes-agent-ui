<template>
 <div class="dashboard">
 <n-spin :show="loading">
 <!-- 顶部统计卡片 -->
 <n-grid :cols="5" :x-gap="12" :y-gap="12">
 <n-gi>
 <n-card class="stat-card">
 <n-statistic label="活跃会话">
 <template #prefix><n-icon :size="20" color="#18a058"><ChatbubblesOutline /></n-icon></template>
 <n-number-animation :from="0" :to="stats.sessions" :duration="800" />
 </n-statistic>
 </n-card>
 </n-gi>
 <n-gi>
 <n-card class="stat-card">
 <n-statistic label="总 Token">
 <template #prefix><n-icon :size="20" color="#2080f0"><FlashOutline /></n-icon></template>
 {{ formatCompact(totals.totalTokens) }}
 </n-statistic>
 </n-card>
 </n-gi>
 <n-gi>
 <n-card class="stat-card">
 <n-statistic label="预估成本">
 <template #prefix><n-icon :size="20" color="#f0a020"><CashOutline /></n-icon></template>
 ${{ totals.totalCost.toFixed(2) }}
 </n-statistic>
 </n-card>
 </n-gi>
 <n-gi>
 <n-card class="stat-card">
 <n-statistic label="已加载技能">
 <template #prefix><n-icon :size="20" color="#8b5cf6"><RocketOutline /></n-icon></template>
 <n-number-animation :from="0" :to="stats.skills" :duration="800" />
 </n-statistic>
 </n-card>
 </n-gi>
 <n-gi>
 <n-card class="stat-card">
 <n-statistic label="记忆条数">
 <template #prefix><n-icon :size="20" color="#ff922b"><BulbOutline /></n-icon></template>
 <n-number-animation :from="0" :to="stats.memoryEntries" :duration="800" />
 </n-statistic>
 </n-card>
 </n-gi>
 </n-grid>

 <!-- 控制栏 -->
 <n-card class="control-bar" :bordered="false">
 <n-space :size="8" wrap>
 <n-button-group size="small">
 <n-button :type="rangePreset === 'today' ? 'primary' : 'default'" secondary @click="setRange('today')">今日</n-button>
 <n-button :type="rangePreset === '7d' ? 'primary' : 'default'" secondary @click="setRange('7d')">7天</n-button>
 <n-button :type="rangePreset === '30d' ? 'primary' : 'default'" secondary @click="setRange('30d')">30天</n-button>
 </n-button-group>
 <input v-model="startDate" type="date" class="date-input" @change="rangePreset = 'custom'" />
 <span class="date-sep">至</span>
 <input v-model="endDate" type="date" class="date-input" @change="rangePreset = 'custom'" />
 <n-button size="small" type="primary" :loading="refreshing" @click="fetchUsage">
 <template #icon><n-icon :component="RefreshOutline" /></template>
 刷新
 </n-button>
 <n-button-group size="small">
 <n-button :type="usageMode === 'tokens' ? 'primary' : 'default'" secondary @click="usageMode = 'tokens'">Token</n-button>
 <n-button :type="usageMode === 'cost' ? 'primary' : 'default'" secondary @click="usageMode = 'cost'">成本</n-button>
 </n-button-group>
 </n-space>
 </n-card>

 <!-- 趋势图表 + 使用结构 -->
 <n-grid :cols="3" :x-gap="12" :y-gap="12" style="margin-top: 16px">
 <n-gi :span="2">
 <n-card title="使用趋势" class="trend-card">
 <template #header-extra>
 <n-tag size="small" :bordered="false" round>
 {{ usageMode === 'tokens' ? formatCompact(totals.totalTokens) + ' tokens' : '$' + totals.totalCost.toFixed(2) }}
 </n-tag>
 </template>
 <div class="trend-chart" v-if="trendPoints.length">
 <svg
 ref="trendSvg"
 :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
 preserveAspectRatio="none"
 class="trend-svg"
 @mousemove="handleTrendHover"
 @mouseleave="hoverIndex = null"
 >
 <!-- 网格线 -->
 <g v-for="g in gridGuides" :key="g.ratio">
 <line :x1="chartLeft" :y1="g.y" :x2="chartLeft + chartUsableWidth" :y2="g.y" class="grid-line" />
 <text x="4" :y="g.y + 4" class="grid-label">{{ formatValue(g.value) }}</text>
 </g>
 <!-- 面积填充 -->
 <path v-if="areaPath" :d="areaPath" class="trend-area" />
 <!-- 折线 -->
 <polyline v-if="polyline" :points="polyline" class="trend-line" />
 <!-- 悬浮线 -->
 <line v-if="hoverPoint" :x1="hoverPoint.x" :y1="chartTop" :x2="hoverPoint.x" :y2="chartTop + chartUsableHeight" class="hover-line" />
 <!-- 数据点 -->
 <circle
 v-for="(p, i) in trendPoints"
 :key="p.date"
 :cx="p.x"
 :cy="p.y"
 :r="hoverPoint?.date === p.date ? 6 : 3"
 class="trend-point"
 :class="{ active: hoverPoint?.date === p.date }"
 />
 </svg>
 <!-- Tooltip -->
 <div v-if="hoverPoint && tooltipStyle" class="trend-tooltip" :style="tooltipStyle">
 {{ hoverPoint.date }} · {{ formatValue(hoverPoint.value) }} · {{ hoverPoint.messages }} 条消息
 </div>
 <!-- X轴标签 -->
 <div class="trend-axis">
 <span>{{ axisLabels.start }}</span>
 <span>{{ axisLabels.mid }}</span>
 <span>{{ axisLabels.end }}</span>
 </div>
 </div>
 <n-empty v-else description="暂无使用数据" />
 </n-card>
 </n-gi>

 <!-- 使用结构分布 -->
 <n-gi :span="1">
 <n-card title="使用结构" class="structure-card">
 <div class="structure-total">
 <span>总计</span>
 <span class="structure-total-value">{{ usageMode === 'tokens' ? formatCompact(totals.totalTokens) : '$' + totals.totalCost.toFixed(2) }}</span>
 </div>
 <div class="segment-track">
 <div
 v-for="seg in usageSegments"
 :key="seg.key"
 class="segment-bar"
 :style="{ width: segmentWidth(seg.value) + '%', background: seg.color }"
 />
 </div>
 <div class="segment-list">
 <div v-for="seg in usageSegments" :key="seg.key + '-row'" class="segment-row">
 <div class="segment-label">
 <span class="segment-dot" :style="{ background: seg.color }"></span>
 <span>{{ seg.label }}</span>
 </div>
 <span>{{ usageMode === 'tokens' ? formatCompact(seg.value) : '$' + seg.value.toFixed(2) }}</span>
 </div>
 </div>
 </n-card>
 </n-gi>
 </n-grid>

 <!-- KPI 指标 -->
 <n-grid :cols="6" :x-gap="12" :y-gap="12" style="margin-top: 16px">
 <n-gi v-for="kpi in kpis" :key="kpi.key">
 <n-card class="kpi-card">
 <n-text depth="3" style="font-size: 12px">{{ kpi.label }}</n-text>
 <div class="kpi-value">{{ kpi.value }}</div>
 <n-text depth="3" style="font-size: 11px">{{ kpi.hint }}</n-text>
 </n-card>
 </n-gi>
 </n-grid>

 <!-- Top 分布 -->
 <n-grid :cols="3" :x-gap="12" :y-gap="12" style="margin-top: 16px">
 <n-gi>
 <n-card title="模型分布" class="dist-card">
 <div class="dist-list" v-if="topModels.length">
 <div v-for="m in topModels" :key="m.model" class="dist-item">
 <div class="dist-row">
 <span class="dist-label">{{ m.model }}</span>
 <span class="dist-value">{{ formatCompact(m.tokens) }}</span>
 </div>
 <div class="dist-bar">
 <div class="dist-bar-fill" :style="{ width: (topModels.length && m.tokens / topModels[0].tokens * 100) + '%' }"></div>
 </div>
 </div>
 </div>
 <n-empty v-else description="暂无数据" size="small" />
 </n-card>
 </n-gi>

 <n-gi>
 <n-card title="平台分布" class="dist-card">
 <div class="dist-list" v-if="topPlatforms.length">
 <div v-for="p in topPlatforms" :key="p.platform" class="dist-item">
 <div class="dist-row">
 <span class="dist-label">{{ p.platform }}</span>
 <span class="dist-value">{{ formatCompact(p.tokens) }}</span>
 </div>
 <div class="dist-bar platform-bar">
 <div class="dist-bar-fill" :style="{ width: (topPlatforms.length && p.tokens / topPlatforms[0].tokens * 100) + '%' }"></div>
 </div>
 </div>
 </div>
 <n-empty v-else description="暂无数据" size="small" />
 </n-card>
 </n-gi>

 <n-gi>
 <n-card title="事件流" class="event-card">
 <div class="event-list" v-if="events.length">
 <div v-for="e in events" :key="e.id" class="event-item" :class="e.type">
 <span class="event-time">{{ formatTime(e.time) }}</span>
 <span class="event-text">{{ e.text }}</span>
 </div>
 </div>
 <n-empty v-else description="暂无事件" size="small" />
 </n-card>
 </n-gi>
 </n-grid>

 <!-- 底部：系统资源 + 网关状态 -->
 <n-grid :cols="2" :x-gap="12" :y-gap="12" style="margin-top: 16px">
 <n-gi>
 <n-card title="系统资源">
 <n-descriptions :column="1" label-placement="left">
 <n-descriptions-item label="运行时间">{{ systemInfo.uptime || '...' }}</n-descriptions-item>
 <n-descriptions-item label="内存使用">
 <n-progress type="line" :percentage="systemInfo.memoryPercent || 0" :status="systemInfo.memoryPercent > 80 ? 'error' : 'success'" />
 {{ systemInfo.memory?.used || 0 }} / {{ systemInfo.memory?.total || 0 }} MB
 </n-descriptions-item>
 <n-descriptions-item label="磁盘使用">
 <n-progress type="line" :percentage="parseInt(systemInfo.diskPercent) || 0" :status="parseInt(systemInfo.diskPercent) > 80 ? 'error' : 'success'" />
 {{ systemInfo.disk?.used || '...' }} / {{ systemInfo.disk?.total || '...' }}
 </n-descriptions-item>
 </n-descriptions>
 </n-card>
 </n-gi>
 <n-gi>
 <n-card title="网关状态">
 <n-descriptions :column="1" label-placement="left">
 <n-descriptions-item label="状态">
 <n-tag :type="gatewayState.isRunning ? 'success' : 'error'" size="medium">
 {{ gatewayState.isRunning ? '✅ 运行中' : '❌ 已停止' }}
 </n-tag>
 </n-descriptions-item>
 <n-descriptions-item label="PID">{{ gatewayState.pid || 'N/A' }}</n-descriptions-item>
 <n-descriptions-item label="连接平台" v-if="gatewayState.platforms">
 <n-space>
 <n-tag v-for="(v, k) in gatewayState.platforms" :key="k" :type="v.state === 'connected' ? 'success' : 'default'">
 {{ k }} ({{ v.state }})
 </n-tag>
 </n-space>
 </n-descriptions-item>
 </n-descriptions>
 </n-card>
 </n-gi>
 </n-grid>
 </n-spin>
 </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ChatbubblesOutline, RocketOutline, BulbOutline, FlashOutline, CashOutline, RefreshOutline } from '@vicons/ionicons5'
import { wsService } from '@/services/websocket'

const API = '/api'
const loading = ref(false)
const refreshing = ref(false)
const hermesHome = ref('')

// 基础统计
const stats = ref({ sessions: 0, skills: 0, memoryEntries: 0 })
const systemInfo = ref<any>({})
const gatewayState = ref<any>({})

// 使用数据
const usageData = ref<any>(null)
const totals = ref({ totalTokens: 0, totalCost: 0, input: 0, output: 0, messages: 0, sessions: 0 })
const dailyUsage = ref<any[]>([])
const aggregates = ref<any>({ byModel: [], byPlatform: [] })

// 事件流
const events = ref<Array<{ id: number; time: number; type: string; text: string }>>([])
let eventId = 0

// 日期范围
const rangePreset = ref<'today' | '7d' | '30d' | 'custom'>('7d')
const startDate = ref('')
const endDate = ref('')
const usageMode = ref<'tokens' | 'cost'>('tokens')

// 图表参数
const chartWidth = 720
const chartHeight = 240
const chartLeft = 56
const chartRight = 18
const chartTop = 18
const chartBottom = 44
const chartUsableWidth = chartWidth - chartLeft - chartRight
const chartUsableHeight = chartHeight - chartTop - chartBottom

// 悬浮状态
const trendSvg = ref<SVGSVGElement | null>(null)
const hoverIndex = ref<number | null>(null)
const tooltipStyle = ref<Record<string, string> | null>(null)

// 格式化
function formatCompact(n: number): string {
 if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
 if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
 return String(n)
}

function formatValue(v: number): string {
 return usageMode.value === 'tokens' ? formatCompact(v) : '$' + v.toFixed(2)
}

function formatTime(ts: number): string {
 const d = new Date(ts)
 return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// 使用结构分段
const usageSegments = computed(() => {
 const t = totals.value
 if (usageMode.value === 'tokens') {
 return [
 { key: 'input', label: '输入', value: t.input, color: '#2080f0' },
 { key: 'output', label: '输出', value: t.output, color: '#18a058' },
 ]
 }
 return [
 { key: 'inputCost', label: '输入成本', value: (t.input / (t.totalTokens || 1)) * t.totalCost, color: '#2080f0' },
 { key: 'outputCost', label: '输出成本', value: (t.output / (t.totalTokens || 1)) * t.totalCost, color: '#18a058' },
 ]
})

const segmentTotal = computed(() => usageSegments.value.reduce((s, x) => s + x.value, 0) || 1)

function segmentWidth(v: number): number {
 const w = (v / segmentTotal.value) * 100
 return Math.max(w, v > 0 ? 4 : 0)
}

// 设置日期范围
function setRange(preset: 'today' | '7d' | '30d') {
 rangePreset.value = preset
 const today = new Date()
 const end = formatDateISO(today)
 if (preset === 'today') {
 startDate.value = end
 endDate.value = end
 } else if (preset === '7d') {
 startDate.value = formatDateISO(addDays(today, -6))
 endDate.value = end
 } else {
 startDate.value = formatDateISO(addDays(today, -29))
 endDate.value = end
 }
 fetchUsage()
}

function formatDateISO(d: Date): string {
 return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number): Date {
 const r = new Date(d)
 r.setDate(r.getDate() + n)
 return r
}

// 获取使用数据
async function fetchUsage() {
 refreshing.value = true
 try {
 const [sess, skills, mem, sys, gw, cfg, usage] = await Promise.all([
 fetch(`${API}/sessions`).then(r => r.json()),
 fetch(`${API}/skills`).then(r => r.json()),
 fetch(`${API}/memories`).then(r => r.json()),
 fetch(`${API}/system`).then(r => r.json()),
 fetch(`${API}/gateway`).then(r => r.json()),
 fetch(`${API}/config`).then(r => r.json()),
 fetch(`${API}/usage?startDate=${startDate.value}&endDate=${endDate.value}`).then(r => r.json())
 ])

 hermesHome.value = cfg?.hermesHome || gw?.hermesHome || '~/.hermes'
 stats.value = {
 sessions: Array.isArray(sess) ? sess.length : 0,
 skills: skills?.count || 0,
 memoryEntries: mem?.count || 0
 }
 systemInfo.value = sys || {}
 gatewayState.value = gw || {}

 usageData.value = usage
 dailyUsage.value = usage?.daily || []
 totals.value = usage?.totals || { totalTokens: 0, totalCost: 0, input: 0, output: 0, messages: 0, sessions: 0 }
 aggregates.value = usage?.aggregates || { byModel: [], byPlatform: [] }

 // 添加事件
 addEvent('info', '数据已刷新')
 } catch (e) {
 console.error('数据获取失败:', e)
 addEvent('error', '数据获取失败')
 } finally {
 refreshing.value = false
 }
}

// 添加事件
function addEvent(type: string, text: string) {
 events.value.unshift({ id: ++eventId, time: Date.now(), type, text })
 if (events.value.length > 20) events.value.pop()
}

// 趋势图计算
const trendSeries = computed(() => {
 return dailyUsage.value.slice(-14).map(d => ({
 date: d.date,
 value: usageMode.value === 'tokens' ? d.tokens : d.cost,
 messages: d.messages || 0
 }))
})

const trendPoints = computed(() => {
 const series = trendSeries.value
 const maxVal = Math.max(...series.map(s => s.value), 1)
 return series.map((s, i) => ({
 ...s,
 x: series.length === 1 ? chartLeft + chartUsableWidth / 2 : chartLeft + (i / (series.length - 1)) * chartUsableWidth,
 y: chartTop + chartUsableHeight - (s.value / maxVal) * chartUsableHeight
 }))
})

const polyline = computed(() => trendPoints.value.map(p => `${p.x},${p.y}`).join(' '))

const areaPath = computed(() => {
 const pts = trendPoints.value
 if (!pts.length) return ''
 return `M ${chartLeft} ${chartTop + chartUsableHeight} L ${pts.map(p => `${p.x} ${p.y}`).join(' L ')} L ${chartLeft + chartUsableWidth} ${chartTop + chartUsableHeight} Z`
})

const gridGuides = computed(() => {
 const series = trendSeries.value
 const maxVal = Math.max(...series.map(s => s.value), 1)
 return [0, 0.25, 0.5, 0.75, 1].map(ratio => ({
 ratio,
 y: chartTop + chartUsableHeight - chartUsableHeight * ratio,
 value: maxVal * ratio
 }))
})

const axisLabels = computed(() => {
 const s = trendSeries.value
 if (!s.length) return { start: '-', mid: '-', end: '-' }
 return {
 start: s[0]?.date?.slice(5) || '-',
 mid: s[Math.floor((s.length - 1) / 2)]?.date?.slice(5) || '-',
 end: s[s.length - 1]?.date?.slice(5) || '-'
 }
})

const hoverPoint = computed(() => hoverIndex.value !== null ? trendPoints.value[hoverIndex.value] : null)

function handleTrendHover(e: MouseEvent) {
 const svg = trendSvg.value
 const pts = trendPoints.value
 if (!svg || !pts.length) { hoverIndex.value = null; return }

 const rect = svg.getBoundingClientRect()
 const svgX = ((e.clientX - rect.left) / rect.width) * chartWidth
 const plotMinX = chartLeft
 const plotMaxX = chartLeft + chartUsableWidth
 if (svgX < plotMinX || svgX > plotMaxX) { hoverIndex.value = null; return }

 let nearest = 0
 let minDist = Math.abs(pts[0].x - svgX)
 for (let i = 1; i < pts.length; i++) {
 const d = Math.abs(pts[i].x - svgX)
 if (d < minDist) { minDist = d; nearest = i }
 }

 hoverIndex.value = nearest
 const p = pts[nearest]
 const pxX = (p.x / chartWidth) * rect.width
 const pxY = (p.y / chartHeight) * rect.height
 tooltipStyle.value = {
 left: `${Math.max(8, Math.min(pxX + 12, rect.width - 268))}px`,
 top: `${Math.max(8, pxY - 42)}px`
 }
}

// Top 模型/平台
const topModels = computed(() => aggregates.value.byModel?.slice(0, 5) || [])
const topPlatforms = computed(() => aggregates.value.byPlatform?.slice(0, 5) || [])

// KPI 指标
const kpis = computed(() => {
 const t = totals.value
 const d = dailyUsage.value
 const totalMessages = d.reduce((s, x) => s + (x.messages || 0), 0)
 const avgTokens = totalMessages > 0 ? Math.round(t.totalTokens / totalMessages) : 0
 const activeDays = d.filter(x => x.tokens > 0).length

 return [
 { key: 'input', label: '输入 Token', value: formatCompact(t.input), hint: '累计输入' },
 { key: 'output', label: '输出 Token', value: formatCompact(t.output), hint: '累计输出' },
 { key: 'avg', label: '平均 Token/消息', value: String(avgTokens), hint: '每条消息' },
 { key: 'messages', label: '总消息数', value: formatCompact(totalMessages), hint: `${d.length} 天数据` },
 { key: 'sessions', label: '会话数', value: String(t.sessions), hint: '已记录会话' },
 { key: 'active', label: '活跃天数', value: String(activeDays), hint: '有使用记录' }
 ]
})

// 初始化
onMounted(() => {
 setRange('7d')
 wsService.connect()
 wsService.subscribe('system:update', (data: any) => {
 systemInfo.value = { ...systemInfo.value, ...data }
 })
 wsService.subscribe('gateway:event', (data: any) => {
 if (data?.type) addEvent(data.type, data.message || JSON.stringify(data))
 })
})
</script>

<style scoped>
.dashboard { max-width: 1600px; margin: 0 auto; }
.stat-card { text-align: center; padding: 8px 0; }
.control-bar { margin-top: 16px; background: transparent; }
.date-input {
 border: 1px solid #e0e0e0;
 border-radius: 6px;
 padding: 4px 8px;
 font-size: 13px;
 background: var(--n-color);
 color: var(--n-text-color);
}
.date-sep { color: #888; font-size: 13px; }

/* 趋势图表 */
.trend-card { min-height: 320px; }
.trend-chart { position: relative; border: 1px solid #e8e8e8; border-radius: 8px; padding: 8px; background: linear-gradient(180deg, rgba(32, 128, 240, 0.04), transparent 40%); }
.trend-svg { width: 100%; height: 250px; cursor: crosshair; }
.grid-line { stroke: #e0e0e0; stroke-width: 1; stroke-dasharray: 4 4; }
.grid-label { fill: #888; font-size: 10px; }
.trend-area { fill: rgba(32, 128, 240, 0.15); }
.trend-line { fill: none; stroke: #2080f0; stroke-width: 2.5; stroke-linejoin: round; }
.hover-line { stroke: rgba(32, 128, 240, 0.5); stroke-width: 1; stroke-dasharray: 3 3; }
.trend-point { fill: #18a058; stroke: rgba(24, 160, 88, 0.3); stroke-width: 3; transition: r 0.15s; }
.trend-point.active { stroke-width: 6; }
.trend-tooltip {
 position: absolute;
 padding: 6px 10px;
 border: 1px solid #e0e0e0;
 border-radius: 8px;
 background: #fff;
 font-size: 12px;
 box-shadow: 0 4px 12px rgba(0,0,0,0.1);
 pointer-events: none;
 white-space: nowrap;
}
.trend-axis { display: flex; justify-content: space-between; margin-top: 8px; color: #888; font-size: 12px; }

/* 使用结构 */
.structure-card { min-height: 200px; }
.structure-total { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
.structure-total-value { font-weight: 600; }
.segment-track { height: 10px; display: flex; border-radius: 5px; overflow: hidden; background: #f0f0f0; }
.segment-bar { height: 100%; transition: width 0.3s; }
.segment-list { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.segment-row { display: flex; justify-content: space-between; font-size: 12px; }
.segment-label { display: flex; align-items: center; gap: 6px; }
.segment-dot { width: 8px; height: 8px; border-radius: 50%; }

/* 分布图 */
.dist-card { min-height: 180px; }
.dist-list { display: flex; flex-direction: column; gap: 8px; }
.dist-item { display: flex; flex-direction: column; gap: 4px; }
.dist-row { display: flex; justify-content: space-between; font-size: 13px; }
.dist-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
.dist-value { color: #888; font-size: 12px; }
.dist-bar { height: 6px; background: #f0f0f0; border-radius: 999px; overflow: hidden; }
.dist-bar-fill { height: 100%; background: linear-gradient(90deg, rgba(32, 128, 240, 0.9), rgba(32, 128, 240, 0.5)); border-radius: 999px; }
.platform-bar .dist-bar-fill { background: linear-gradient(90deg, rgba(24, 160, 88, 0.9), rgba(24, 160, 88, 0.5)); }

/* KPI 卡片 */
.kpi-card { text-align: center; padding: 12px 8px; }
.kpi-value { font-size: 20px; font-weight: 600; margin: 4px 0; color: #2080f0; }

/* 事件流 */
.event-card { min-height: 180px; }
.event-list { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
.event-item { display: flex; gap: 8px; font-size: 12px; padding: 4px 8px; border-radius: 4px; background: #f9f9f9; }
.event-item.info { border-left: 3px solid #2080f0; }
.event-item.success { border-left: 3px solid #18a058; }
.event-item.error { border-left: 3px solid #d03050; }
.event-item.warning { border-left: 3px solid #f0a020; }
.event-time { color: #888; min-width: 70px; }
.event-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
