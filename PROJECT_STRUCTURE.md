# Hermes Agent Dashboard - 项目结构文档

## 📊 项目概览

- **项目名称**: hermes-agent-dashboard
- **技术栈**: Vue 3 + TypeScript + Naive UI + Vite
- **总代码行数**: 3,085 行
- **Vue 组件**: 14 个文件，共 2,860 行
- **TypeScript**: 2 个文件，共 109 行

## 📁 目录结构

```
hermes-agent-dashboard/
├── public/                  # 静态资源
│   └── favicon.svg         # 网站图标
├── src/
│   ├── layouts/            # 布局组件
│   │   └── DefaultLayout.vue  (235 行) - 主布局框架
│   ├── views/              # 页面视图
│   │   ├── Dashboard.vue   (213 行) - 仪表盘首页
│   │   ├── Login.vue       (125 行) - 登录页面
│   │   ├── agents/
│   │   │   └── AgentsPage.vue (188 行) - 多智能体管理
│   │   ├── channels/
│   │   │   └── ChannelsPage.vue (204 行) - 频道管理
│   │   ├── chat/
│   │   │   └── ChatPage.vue (221 行) - 在线对话
│   │   ├── cron/
│   │   │   └── CronPage.vue (212 行) - 定时任务
│   │   ├── memory/
│   │   │   └── MemoryPage.vue (166 行) - 记忆管理
│   │   ├── models/
│   │   │   └── ModelsPage.vue (192 行) - 模型管理
│   │   ├── sessions/
│   │   │   └── SessionsPage.vue (253 行) - 会话管理
│   │   ├── settings/
│   │   │   └── SettingsPage.vue (270 行) - 系统设置
│   │   ├── skills/
│   │   │   └── SkillsPage.vue (307 行) - 技能管理
│   │   └── system/
│   │       └── SystemPage.vue (245 行) - 系统监控
│   ├── router/
│   │   └── index.ts        (98 行) - 路由配置
│   ├── App.vue             (29 行) - 根组件
│   └── main.ts             (11 行) - 应用入口
├── server/                 # 后端服务（预留）
├── index.html             # HTML 模板
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
├── tsconfig.node.json     # Node TypeScript 配置
└── vite.config.ts         # Vite 构建配置
```

## 🗺️ 路由配置

| 路径 | 组件 | 名称 | 功能 |
|------|------|------|------|
| `/login` | Login.vue | 登录 | 用户认证入口 |
| `/dashboard` | Dashboard.vue | 仪表盘 | 系统概览、统计数据 |
| `/chat` | ChatPage.vue | 在线对话 | 实时聊天界面 |
| `/sessions` | SessionsPage.vue | 会话管理 | 会话列表与历史 |
| `/skills` | SkillsPage.vue | 技能管理 | 技能的增删改查 |
| `/memory` | MemoryPage.vue | 记忆管理 | 用户画像、智能体记忆 |
| `/models` | ModelsPage.vue | 模型管理 | AI 模型配置 |
| `/channels` | ChannelsPage.vue | 频道管理 | 多平台连接管理 |
| `/cron` | CronPage.vue | 定时任务 | 定时任务调度 |
| `/agents` | AgentsPage.vue | 多智能体 | 智能体编排 |
| `/system` | SystemPage.vue | 系统监控 | 资源、日志、状态 |
| `/settings` | SettingsPage.vue | 系统设置 | 全局配置 |

## 🎨 核心功能模块

### 1. 仪表盘 (Dashboard)
- 统计卡片：活跃会话、技能数量、定时任务、记忆条数
- 最近活动时间线
- 模型使用分布图
- 系统资源监控（CPU、内存、磁盘）

### 2. 在线对话 (Chat)
- 左侧会话列表
- 右侧聊天界面
- 支持 Markdown 渲染
- 消息发送与接收

### 3. 技能管理 (Skills)
- 技能列表展示（网格视图）
- 分类过滤（GitHub、开发、MLOps 等）
- 技能搜索
- 安装/编辑/删除技能
- 技能详情抽屉

### 4. 记忆管理 (Memory)
- 用户画像（User Profile）
- 智能体记忆（Agent Memory）
- 环境信息（Environment）
- 记忆编辑与删除

### 5. 会话管理 (Sessions)
- 会话数据表格
- 多条件筛选（平台、状态）
- 会话详情查看
- 批量操作

### 6. 定时任务 (Cron)
- 任务列表（支持启用/暂停）
- 创建新任务（多种调度类型）
- 执行历史查看
- 立即执行功能

### 7. 模型管理 (Models)
- 模型卡片展示
- 模型测试功能
- 设为默认模型
- 添加新模型配置

### 8. 频道管理 (Channels)
- 多平台支持（Telegram、飞书、钉钉、企业微信）
- 连接状态显示
- 频道配置编辑
- 连接/断开操作

### 9. 多智能体 (Agents)
- 智能体卡片展示
- 角色（协调者/执行者）
- 创建/编辑/删除智能体
- 技能绑定

### 10. 系统监控 (System)
- 实时资源监控
- 应用统计数据
- 日志查看器（支持级别过滤）
- 已加载技能状态
- 连接状态检查

### 11. 系统设置 (Settings)
- 常规设置（模型、语言、主题）
- AI 设置（Temperature、Max Tokens）
- 通知设置（邮件、免打扰）
- 安全设置（API 密钥、IP 白名单）
- 高级设置（缓存、并发）

## 🎯 下一步计划

1. **后端 API 开发**
   - Express/Fastify 服务器
   - RESTful API 接口
   - WebSocket 实时通信

2. **数据持久化**
   - SQLite/PostgreSQL 数据库
   - Redis 缓存层

3. **认证系统**
   - JWT Token 认证
   - 权限管理

4. **功能增强**
   - 实际连接 Hermes Agent API
   - 主题切换完善
   - 国际化支持

5. **部署配置**
   - Docker 容器化
   - Nginx 反向代理
   - 生产环境配置

## 🚀 启动方式

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 📦 依赖清单

### 生产依赖
- `vue`: ^3.4.21
- `vue-router`: ^4.3.0
- `naive-ui`: ^2.38.1
- `@vicons/ionicons5`: ^0.12.0

### 开发依赖
- `typescript`: ^5.4.2
- `vite`: ^5.2.0
- `@vitejs/plugin-vue`: ^5.0.4
- `vue-tsc`: ^2.0.6

---

**生成时间**: 2024-01-20
**版本**: v1.0.0
**状态**: ✅ 所有文件完整，可正常启动