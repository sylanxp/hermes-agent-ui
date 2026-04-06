<template>
  <div class="skills-page">
    <n-card>
      <template #header>
        <div class="card-header">
          <span>技能列表</span>
          <n-space>
            <n-input v-model:value="searchText" placeholder="搜索技能..." clearable style="width: 200px">
              <template #prefix><n-icon><SearchOutline /></n-icon></template>
            </n-input>
            <n-button type="primary" @click="showInstallModal = true">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              安装技能
            </n-button>
          </n-space>
        </div>
      </template>

      <!-- Loading state -->
      <n-spin :show="loading">
        <n-tabs v-model:value="activeCategory" type="line" animated>
          <n-tab-pane name="all" tab="全部">
            <n-empty v-if="filteredSkills.length === 0 && !loading" :description="searchText ? '未找到匹配的技能' : '暂无技能'" />
            <n-grid v-else :cols="3" :x-gap="16" :y-gap="16">
              <n-gi v-for="skill in filteredSkills" :key="skill.name">
                <n-card class="skill-card" hoverable @click="showSkillDetail(skill)">
                  <div class="skill-header">
                    <div class="skill-icon-area" style="position:relative; flex-shrink:0;">
                      <n-icon :size="32" :color="getSkillColor(skill.category)">
                        <component :is="getSkillIcon(skill.category)" />
                      </n-icon>
                      <n-switch
                        size="small"
                        :value="skill.enabled !== false"
                        @update:value="(val: boolean) => toggleSkillEnable(skill, val)"
                        @click.stop
                        :loading="toggling[skill.name]"
                        style="position:absolute; bottom:-6px; right:-10px;"
                      />
                    </div>
                    <div class="skill-info">
                      <h3>{{ skill.name }}</h3>
                      <n-tag size="small" :type="skill.builtIn ? 'success' : 'default'">
                        {{ skill.builtIn ? '内置' : '用户' }}
                      </n-tag>
                      <n-tag v-if="skill.enabled === false" size="small" type="error" style="margin-left:4px">
                        已禁用
                      </n-tag>
                    </div>
                  </div>
                  <p class="skill-desc">{{ skill.description }}</p>
                  <div class="skill-meta">
                    <span v-if="skill.category">{{ skill.category }}</span>
                    <span v-if="skill.tags?.length">{{ skill.tags.slice(0, 2).join(', ') }}</span>
                  </div>
                </n-card>
              </n-gi>
            </n-grid>
          </n-tab-pane>
          <n-tab-pane v-for="cat in categories" :key="cat.name" :name="cat.name" :tab="cat.label">
            <n-empty v-if="getSkillsByCategory(cat.name).length === 0 && !loading" :description="searchText ? '未找到匹配的技能' : '该分类下暂无技能'" />
            <n-grid :cols="3" :x-gap="16" :y-gap="16" v-else>
              <n-gi v-for="skill in getSkillsByCategory(cat.name)" :key="skill.name">
                <n-card class="skill-card" hoverable @click="showSkillDetail(skill)">
                  <div class="skill-header">
                    <div class="skill-icon-area" style="position:relative; flex-shrink:0;">
                      <n-icon :size="32" :color="getSkillColor(skill.category)">
                        <component :is="getSkillIcon(skill.category)" />
                      </n-icon>
                      <n-switch
                        size="small"
                        :value="skill.enabled !== false"
                        @update:value="(val: boolean) => toggleSkillEnable(skill, val)"
                        @click.stop
                        :loading="toggling[skill.name]"
                        style="position:absolute; bottom:-6px; right:-10px;"
                      />
                    </div>
                    <div class="skill-info">
                      <h3>{{ skill.name }}</h3>
                      <n-tag size="small">{{ skill.builtIn ? '内置' : '用户' }}</n-tag>
                      <n-tag v-if="skill.enabled === false" size="small" type="error" style="margin-left:4px">
                        已禁用
                      </n-tag>
                    </div>
                  </div>
                  <p class="skill-desc">{{ skill.description }}</p>
                </n-card>
              </n-gi>
            </n-grid>
          </n-tab-pane>
        </n-tabs>
      </n-spin>
    </n-card>

    <!-- 技能详情抽屉 -->
    <n-drawer v-model:show="showDetailDrawer" :width="600" placement="right">
      <n-drawer-content :title="selectedSkill?.name" closable v-if="selectedSkill">
        <n-spin :show="detailLoading">
          <n-descriptions :column="1" label-placement="left">
            <n-descriptions-item label="名称">{{ selectedSkill.name }}</n-descriptions-item>
            <n-descriptions-item label="描述">{{ selectedSkill.description }}</n-descriptions-item>
            <n-descriptions-item label="分类">{{ selectedSkill.category || '未分类' }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag :type="selectedSkill.enabled === false ? 'error' : 'success'">
                {{ selectedSkill.enabled === false ? '已禁用' : '已启用' }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="类型">
              <n-tag :type="selectedSkill.builtIn ? 'success' : 'info'">
                {{ selectedSkill.builtIn ? '内置技能' : '用户技能' }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="标签" v-if="selectedSkill.tags?.length">
              <n-space>
                <n-tag v-for="tag in selectedSkill.tags" :key="tag" size="small">{{ tag }}</n-tag>
              </n-space>
            </n-descriptions-item>
            <n-descriptions-item label="源码路径" v-if="detailData?.path">
              <n-text code style="font-size:12px">{{ detailData.path }}</n-text>
            </n-descriptions-item>
          </n-descriptions>
          <n-divider />
          <n-h4>技能内容预览</n-h4>
          <n-code :code="detailData?.content || selectedSkill?.description || '暂无详细内容'" language="markdown" />
        </n-spin>
        <template #footer>
          <n-space>
            <n-button @click="toggleSkillInDrawer" :type="selectedSkill.enabled === false ? 'primary' : 'warning'" :loading="toggling[selectedSkill.name]">
              <template #icon><n-icon><FlashOutline /></n-icon></template>
              {{ selectedSkill.enabled === false ? '启用' : '禁用' }}
            </n-button>
            <n-button @click="uninstallSkill" type="error" :loading="uninstalling[selectedSkill.name]" :disabled="selectedSkill.builtIn">
              <template #icon><n-icon><TrashOutline /></n-icon></template>
              卸载
            </n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>

    <!-- 安装技能模态框 -->
    <n-modal v-model:show="showInstallModal" preset="card" title="安装新技能" style="width: 600px">
      <n-form :model="installForm" label-placement="left" label-width="80">
        <n-form-item label="技能名称">
          <n-input v-model:value="installForm.name" placeholder="例如: my-custom-skill" />
        </n-form-item>
        <n-form-item label="分类">
          <n-select v-model:value="installForm.category" :options="categoryOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showInstallModal = false">取消</n-button>
          <n-button type="primary" :loading="installing" @click="installSkill">安装</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { 
  SearchOutline, 
  AddOutline, 
  TrashOutline,
  FlashOutline,
  RocketOutline,
  CodeSlashOutline,
  FlaskOutline,
  CloudOutline,
  TerminalOutline,
  MailOutline,
  CreateOutline
} from '@vicons/ionicons5'

// ── Types ─────────────────────────────────────────────────

interface Skill {
  name: string
  description: string
  category?: string
  tags?: string[]
  builtIn: boolean
  enabled?: boolean
  content?: string
  source?: string
  skill_file?: string
}

interface SkillDetail {
  name: string
  category: string
  content: string
  path: string
}

// ── State ─────────────────────────────────────────────────

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const skills = ref<Skill[]>([])
const categories = ref<Array<{ name: string; label: string }>>([])

const searchText = ref('')
const activeCategory = ref('all')
const showDetailDrawer = ref(false)
const showInstallModal = ref(false)
const detailLoading = ref(false)

// Detail data fetched from API for the selected skill
const selectedSkill = ref<Skill | null>(null)
const detailData = ref<SkillDetail | null>(null)

// Mutation loading states
const toggling: Record<string, boolean> = {}
const uninstalling: Record<string, boolean> = {}
const installing = ref(false)

const installForm = ref({
  name: '',
  category: ''
})

// ── Computed ──────────────────────────────────────────────

const filteredSkills = computed(() => {
  let list = [...skills.value]

  // Search filter
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.tags || []).some(t => t.toLowerCase().includes(q))
    )
  }

  return list
})

const categoryOptions = computed(() => {
  return categories.value.map(c => ({ label: c.label, value: c.name }))
})

// ── Helpers ───────────────────────────────────────────────

const getSkillsByCategory = (category: string) => {
  const list = filteredSkills.value
  if (!category || category === 'all') return list
  return list.filter(s => s.category === category)
}

const getSkillColor = (category?: string) => {
  const baseColors: Record<string, string> = {}
  const known = [
    'github', 'software-development', 'mlops', 'data-science',
    'autonomous-ai-agents', 'note-taking', 'research'
  ]
  // Hash-based color so unknown categories also get a deterministic color
  const hash = (category || 'default').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const palette = ['#63e6be', '#ffd43b', '#69db7c', '#ff922b', '#a855f7', '#74c0fc', '#f783ac', '#845ef7']
  return baseColors[category || ''] || palette[hash % palette.length]
}

const getSkillIcon = (category?: string) => {
  const icons: Record<string, any> = {
    'github': CodeSlashOutline,
    'software-development': TerminalOutline,
    'mlops': CloudOutline,
    'data-science': FlaskOutline,
    'autonomous-ai-agents': RocketOutline,
    'note-taking': MailOutline,
    'research': CreateOutline
  }
  return icons[category || ''] || RocketOutline
}

// ── API ───────────────────────────────────────────────────

const loadSkills = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/skills')
    const data = await res.json()

    // The server returns { skills: [...], categories: [...], count }
    const rawSkills: Skill[] = (data.skills || []).map((s: any) => ({
      name: s.name || 'unknown',
      description: s.description || s.title || '',
      category: s.category || s.source || 'unknown',
      tags: s.tags || [],
      builtIn: s.builtIn ?? (s.source !== 'user'),
      enabled: s.enabled !== false,
      content: s.content,
      source: s.source,
      skill_file: s.skill_file
    }))

    skills.value = rawSkills

    // Build category list from the union of API-provided categories and unique categories from skills
    const serverCatNames: string[] = data.categories || []

    // Collect unique category values from real skills
    const seenCats = new Set<string>()
    for (const sk of rawSkills) {
      if (sk.category) seenCats.add(sk.category)
    }

    const allCatNames = Array.from(new Set([...serverCatNames, ...seenCats]))
    const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)

    categories.value = allCatNames.map(name => ({
      name,
      label: capitalize(name).replace(/-/g, ' ')
    }))
  } catch (err: any) {
    message.error('加载技能列表失败: ' + (err.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

const fetchSkillDetail = async (skill: Skill) => {
  detailLoading.value = true
  try {
    const res = await fetch(`/api/skills/detail/${skill.name}`)
    if (res.ok) {
      detailData.value = await res.json()
    } else {
      detailData.value = null
    }
  } catch {
    detailData.value = null
  } finally {
    detailLoading.value = false
  }
}

const toggleSkillEnable = async (skill: Skill, enable: boolean) => {
  const endpoint = enable ? `/api/skills/${skill.name}/enable` : `/api/skills/${skill.name}/disable`
  toggling[skill.name] = true
  try {
    const res = await fetch(endpoint, { method: 'PUT' })
    const data = await res.json()
    if (res.ok && data.success) {
      skill.enabled = enable
      message.success(`${skill.name} 已${enable ? '启用' : '禁用'}`)
    } else {
      message.error(data.error || `切换失败`)
    }
  } catch (err: any) {
    message.error('操作失败: ' + err.message)
  } finally {
    toggling[skill.name] = false
  }
}

const toggleSkillInDrawer = async () => {
  if (!selectedSkill.value) return
  const enable = selectedSkill.value.enabled === false
  toggling[selectedSkill.value.name] = true
  try {
    const endpoint = enable
      ? `/api/skills/${selectedSkill.value.name}/enable`
      : `/api/skills/${selectedSkill.value.name}/disable`
    const res = await fetch(endpoint, { method: 'PUT' })
    const data = await res.json()
    if (res.ok && data.success) {
      selectedSkill.value.enabled = enable
      message.success(`${selectedSkill.value.name} 已${enable ? '启用' : '禁用'}`)
    } else {
      message.error(data.error || '操作失败')
    }
  } catch (err: any) {
    message.error('操作失败: ' + err.message)
  } finally {
    toggling[selectedSkill.value.name] = false
  }
}

const uninstallSkill = () => {
  if (!selectedSkill.value) return
  dialog.warning({
    title: '确认卸载',
    content: `确定要卸载技能 "${selectedSkill.value.name}" 吗？此操作不可撤销。`,
    positiveText: '卸载',
    negativeText: '取消',
    onPositiveClick: async () => {
      const name = selectedSkill.value!.name
      uninstalling[name] = true
      try {
        const res = await fetch(`/api/skills/uninstall/${name}`, { method: 'POST' })
        const data = await res.json()
        if (res.ok && data.success) {
          message.success('技能已卸载')
          skills.value = skills.value.filter(s => s.name !== name)
          showDetailDrawer.value = false
        } else {
          message.error(data.error || '卸载失败')
        }
      } catch (err: any) {
        message.error('卸载失败: ' + err.message)
      } finally {
        uninstalling[name] = false
      }
    }
  })
}

const installSkill = async () => {
  if (!installForm.value.name) {
    message.error('请填写技能名称')
    return
  }
  installing.value = true
  try {
    const res = await fetch('/api/skills/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: installForm.value.name })
    })
    const data = await res.json()
    if (res.ok && data.success) {
      message.success('技能安装成功')
      showInstallModal.value = false
      installForm.value = { name: '', category: '' }
      await loadSkills()
    } else {
      message.error(data.error || '安装失败')
    }
  } catch (err: any) {
    message.error('安装失败: ' + err.message)
  } finally {
    installing.value = false
  }
}

// ── Actions ───────────────────────────────────────────────

const showSkillDetail = async (skill: Skill) => {
  selectedSkill.value = skill
  detailData.value = null
  showDetailDrawer.value = true
  // Fetch detailed content from the server
  await fetchSkillDetail(skill)
}

// ── Lifecycle ─────────────────────────────────────────────

onMounted(() => {
  loadSkills()
})
</script>

<style scoped>
.skills-page {
  max-width: 1400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.skill-card:hover {
  transform: translateY(-2px);
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.skill-info h3 {
  margin: 0;
  font-size: 16px;
}

.skill-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  margin: 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.skill-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}
</style>
