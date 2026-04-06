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

      <n-tabs v-model:value="activeCategory" type="line" animated>
        <n-tab-pane name="all" tab="全部">
          <n-empty v-if="filteredSkills.length === 0" description="暂无技能" />
          <n-grid :cols="3" :x-gap="16" :y-gap="16" v-else>
            <n-gi v-for="skill in filteredSkills" :key="skill.name">
              <n-card class="skill-card" hoverable @click="showSkillDetail(skill)">
                <div class="skill-header">
                  <n-icon :size="32" :color="getSkillColor(skill.category)">
                    <component :is="getSkillIcon(skill.category)" />
                  </n-icon>
                  <div class="skill-info">
                    <h3>{{ skill.name }}</h3>
                    <n-tag size="small" :type="skill.builtIn ? 'success' : 'default'">
                      {{ skill.builtIn ? '内置' : '用户' }}
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
          <n-grid :cols="3" :x-gap="16" :y-gap="16">
            <n-gi v-for="skill in getSkillsByCategory(cat.name)" :key="skill.name">
              <n-card class="skill-card" hoverable @click="showSkillDetail(skill)">
                <div class="skill-header">
                  <n-icon :size="32" :color="getSkillColor(skill.category)">
                    <component :is="getSkillIcon(skill.category)" />
                  </n-icon>
                  <div class="skill-info">
                    <h3>{{ skill.name }}</h3>
                    <n-tag size="small">{{ skill.builtIn ? '内置' : '用户' }}</n-tag>
                  </div>
                </div>
                <p class="skill-desc">{{ skill.description }}</p>
              </n-card>
            </n-gi>
          </n-grid>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 技能详情抽屉 -->
    <n-drawer v-model:show="showDetailDrawer" :width="600" placement="right">
      <n-drawer-content :title="selectedSkill?.name" closable>
        <n-descriptions :column="1" label-placement="left" v-if="selectedSkill">
          <n-descriptions-item label="名称">{{ selectedSkill.name }}</n-descriptions-item>
          <n-descriptions-item label="描述">{{ selectedSkill.description }}</n-descriptions-item>
          <n-descriptions-item label="分类">{{ selectedSkill.category || '未分类' }}</n-descriptions-item>
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
        </n-descriptions>
        <n-divider />
        <n-h4>技能内容预览</n-h4>
        <n-code :code="selectedSkill?.content || '暂无内容'" language="markdown" />
        <template #footer>
          <n-space>
            <n-button @click="editSkill" type="primary">
              <template #icon><n-icon><CreateOutline /></n-icon></template>
              编辑
            </n-button>
            <n-button @click="deleteSkill" type="error" :disabled="selectedSkill?.builtIn">
              <template #icon><n-icon><TrashOutline /></n-icon></template>
              删除
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
        <n-form-item label="技能内容">
          <n-input 
            v-model:value="installForm.content" 
            type="textarea" 
            placeholder="粘贴 SKILL.md 内容..."
            :rows="10"
          />
        </n-form-item>
        <n-form-item label="分类">
          <n-select v-model:value="installForm.category" :options="categoryOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showInstallModal = false">取消</n-button>
          <n-button type="primary" @click="installSkill">安装</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { 
  SearchOutline, 
  AddOutline, 
  CreateOutline, 
  TrashOutline,
  RocketOutline,
  CodeSlashOutline,
  FlaskOutline,
  CloudOutline,
  TerminalOutline,
  MailOutline
} from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()

const searchText = ref('')
const activeCategory = ref('all')
const showDetailDrawer = ref(false)
const showInstallModal = ref(false)
const selectedSkill = ref<Skill | null>(null)

interface Skill {
  name: string
  description: string
  category?: string
  tags?: string[]
  builtIn: boolean
  content?: string
}

const skills = ref<Skill[]>([
  { name: 'github-pr-workflow', description: '完整 PR 生命周期管理', category: 'github', tags: ['PR', 'Workflow'], builtIn: true },
  { name: 'codebase-inspection', description: '代码库规模与语言分析', category: 'github', tags: ['LOC', 'Analysis'], builtIn: true },
  { name: 'systematic-debugging', description: '系统化调试方法论', category: 'software-development', tags: ['Debug', 'TDD'], builtIn: true },
  { name: 'jupyter-live-kernel', description: '实时 Jupyter 内核交互', category: 'data-science', tags: ['Jupyter', 'Python'], builtIn: true },
  { name: 'unsloth', description: '高效 LLM 微调指南', category: 'mlops', tags: ['Fine-tuning', 'LLM'], builtIn: true },
  { name: 'obsidian', description: 'Obsidian 知识库管理', category: 'note-taking', tags: ['Notes', 'Knowledge'], builtIn: true },
  { name: 'arxiv', description: '学术论文检索', category: 'research', tags: ['Paper', 'Academic'], builtIn: true },
  { name: 'claude-code', description: 'Claude Code 智能体委托', category: 'autonomous-ai-agents', tags: ['Agent', 'Claude'], builtIn: true }
])

const categories = [
  { name: 'github', label: 'GitHub' },
  { name: 'software-development', label: '开发' },
  { name: 'mlops', label: 'MLOps' },
  { name: 'data-science', label: '数据科学' },
  { name: 'autonomous-ai-agents', label: '智能体' }
]

const categoryOptions = categories.map(c => ({ label: c.label, value: c.name }))

const installForm = ref({
  name: '',
  content: '',
  category: ''
})

const filteredSkills = computed(() => {
  if (!searchText.value) return skills.value
  const search = searchText.value.toLowerCase()
  return skills.value.filter(s => 
    s.name.toLowerCase().includes(search) || 
    s.description.toLowerCase().includes(search)
  )
})

const getSkillsByCategory = (category: string) => {
  return filteredSkills.value.filter(s => s.category === category)
}

const getSkillColor = (category?: string) => {
  const colors: Record<string, string> = {
    'github': '#63e6be',
    'software-development': '#ffd43b',
    'mlops': '#69db7c',
    'data-science': '#ff922b',
    'autonomous-ai-agents': '#a855f7'
  }
  return colors[category || ''] || '#888'
}

const getSkillIcon = (category?: string) => {
  const icons: Record<string, any> = {
    'github': CodeSlashOutline,
    'software-development': TerminalOutline,
    'mlops': CloudOutline,
    'data-science': FlaskOutline,
    'autonomous-ai-agents': RocketOutline,
    'note-taking': MailOutline
  }
  return icons[category || ''] || RocketOutline
}

const showSkillDetail = (skill: Skill) => {
  selectedSkill.value = skill
  showDetailDrawer.value = true
}

const editSkill = () => {
  message.info('编辑功能开发中...')
}

const deleteSkill = () => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除技能 "${selectedSkill.value?.name}" 吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      message.success('删除成功')
      showDetailDrawer.value = false
    }
  })
}

const installSkill = () => {
  if (!installForm.value.name || !installForm.value.content) {
    message.error('请填写完整信息')
    return
  }
  message.success('技能安装成功')
  showInstallModal.value = false
}
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