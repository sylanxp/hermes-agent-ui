/**
 * Hermes Agent Dashboard — Backend API Server
 * 
 * Serves real-time data from ~/.hermes to the frontend dashboard.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const http = require('http');
const WebSocket = require('ws');

const execAsync = promisify(exec);
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket 连接管理
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`📡 WebSocket 客户端连接，当前 ${wsClients.size} 个连接`);
  
  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`📡 WebSocket 客户端断开，当前 ${wsClients.size} 个连接`);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket 错误:', err.message);
    wsClients.delete(ws);
  });
});

// 广播消息给所有 WebSocket 客户端
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wsClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

// 定时推送系统状态
setInterval(async () => {
  try {
    const [uptime, mem, disk, load] = await Promise.all([
      execAsync('uptime -p', { timeout: 5000 }).catch(() => ({ stdout: 'N/A' })),
      execAsync("free -m | awk '/Mem:/{printf \"%d %d %d\", $2, $3, $7}'", { timeout: 5000 }).catch(() => ({ stdout: '0 0 0' })),
      execAsync("df -h / | awk 'NR==2{print $2, $3, $4, $5}'", { timeout: 5000 }).catch(() => ({ stdout: 'N/A' })),
      execAsync("awk '{print $1, $2, $3}' /proc/loadavg", { timeout: 5000 }).catch(() => ({ stdout: 'N/A' }))
    ]);
    
    const [memTotal, memUsed, memAvail] = mem.stdout.trim().split(' ').map(Number);
    const [diskTotal, diskUsed, diskAvail, diskPct] = disk.stdout.trim().split(' ');
    
    broadcast('system:update', {
      uptime: uptime.stdout.trim(),
      cpuLoad: load.stdout.trim(),
      memory: { total: memTotal || 0, used: memUsed || 0, available: memAvail || 0 },
      disk: { total: diskTotal, used: diskUsed, available: diskAvail, percent: diskPct },
      memoryPercent: memTotal ? Math.round(((memTotal - memAvail) / memTotal) * 100) : 0,
      diskPercent: parseInt(diskPct) || 0
    });
  } catch (e) {
    // 静默失败
  }
}, 5000);
app.use(cors({ origin: '*' }));
app.use(express.json());

const HERMES_HOME = process.env.HOME + '/.hermes';

// ── Helpers ──────────────────────────────────────────────

function readJSON(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function runCommand(cmd, timeout = 15000) {
  return execAsync(cmd, { timeout, maxBuffer: 1024 * 1024 });
}

// Parse the YAML config using a simple key:value extractor
function parseConfig() {
  const filePath = path.join(HERMES_HOME, 'config.yaml');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = {};
    let currentSection = '';
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (!line.startsWith(' ') && !line.startsWith('\t') && trimmed.endsWith(':')) {
        // Top-level section
        currentSection = trimmed.replace(':', '');
        continue;
      }
      
      if (line.startsWith(' ') || line.startsWith('\t')) {
        // Nested key
        const idx = trimmed.indexOf(': ');
        if (idx > 0) {
          const key = currentSection ? `${currentSection}.${trimmed.substring(0, idx)}` : trimmed.substring(0, idx);
          config[key] = trimmed.substring(idx + 2).replace(/^["']|["']$/g, '');
        }
      } else {
        // Top-level key:value
        const idx = trimmed.indexOf(': ');
        if (idx > 0 && !trimmed.endsWith(':')) {
          config[trimmed.substring(0, idx)] = trimmed.substring(idx + 2).replace(/^["']|["']$/g, '');
        }
      }
    }
    return config;
  } catch {
    return {};
  }
}

// ── Routes ───────────────────────────────────────────────

// 🏥 Health check
app.get('/api/health', async (req, res) => {
  let gatewayRunning = false;
  try {
    const { stdout } = await runCommand('pgrep -f "hermes.*gateway" 2>/dev/null | wc -l');
    gatewayRunning = parseInt(stdout.trim()) > 0;
  } catch {}
  res.json({ status: 'ok', timestamp: new Date().toISOString(), gatewayRunning, hermesHome: HERMES_HOME });
});

// 🚪 Gateway status
app.get('/api/gateway', async (req, res) => {
  const gw = readJSON(path.join(HERMES_HOME, 'gateway_state.json'), {});
  let isRunning = false;
  try {
    const { stdout } = await runCommand('pgrep -f "hermes.*gateway" 2>/dev/null | wc -l');
    isRunning = parseInt(stdout.trim()) > 0;
  } catch {}
  res.json({ pid: gw.pid, state: gw.gateway_state || (isRunning ? 'running' : 'stopped'), isRunning, platforms: gw.platforms || {}, lastUpdate: gw.updated_at });
});

// 📡 Channels
app.get('/api/channels', async (req, res) => {
  const cd = readJSON(path.join(HERMES_HOME, 'channel_directory.json'), { platforms: {} });
  const gw = readJSON(path.join(HERMES_HOME, 'gateway_state.json'), {});
  const pStatus = gw.platforms || {};
  const channels = [];
  for (const [platform, list] of Object.entries(cd.platforms || {})) {
    if (list && Array.isArray(list)) {
      for (const ch of list) {
        channels.push({
          id: `${platform}-${ch.id}`,
          name: ch.name || platform,
          type: ch.type,
          platform,
          threadId: ch.thread_id,
          connected: !!pStatus[platform],
          messageCount: ch.messages_count || 0,
          lastActivity: 'N/A'
        });
      }
    }
  }
  res.json(channels);
});

// 💬 Sessions
app.get('/api/sessions', (req, res) => {
  const sessionsFile = path.join(HERMES_HOME, 'sessions', 'sessions.json');
  const data = readJSON(sessionsFile, {});
  const sessions = [];
  const platformIcons = { telegram: '💬', feishu: '📱', discord: '🎮', whatsapp: '📞', dingtalk: '🏢' };
  
  for (const [key, session] of Object.entries(data)) {
    if (!session || typeof session !== 'object') continue;
    const parts = key.split(':');
    const platform = session.platform || parts[2] || 'unknown';
    const displayName = session.display_name || '无标题会话';
    
    // Try to get message count from individual session files
    let messageCount = session.message_count || 0;
    const sessionId = session.session_id;
    if (sessionId) {
      try {
        const sessionFilePath = path.join(HERMES_HOME, 'sessions', `session_${sessionId.replace(/_/g, '_')}.json`);
        // Try pattern: session_YYYYMMDD_HHMMSS_ID.json
        const sessionFiles = fs.readdirSync(path.join(HERMES_HOME, 'sessions'))
          .filter(f => f.startsWith('session_') && f.endsWith('.json'));
        for (const sf of sessionFiles) {
          try {
            const sfData = readJSON(path.join(HERMES_HOME, 'sessions', sf), {});
            if (sfData.session_key === key || sfData.session_id === sessionId) {
              messageCount = sfData.message_count || sfData.messages?.length || messageCount;
              break;
            }
          } catch {}
        }
      } catch {}
    }
    
    sessions.push({
      id: session.session_key || key,
      sessionId: session.session_id,
      title: displayName,
      platform,
      platformIcon: platformIcons[platform] || '🔌',
      chatType: session.chat_type || 'dm',
      status: session.status || 'active',
      created: session.created_at ? new Date(session.created_at).toLocaleString('zh-CN') : 'N/A',
      lastActivity: session.updated_at ? new Date(session.updated_at).toLocaleString('zh-CN') : 'N/A',
      messageCount,
      tokens: session.total_tokens || 0,
      inputTokens: session.input_tokens || 0,
      outputTokens: session.output_tokens || 0,
      estimatedCost: session.estimated_cost_usd || 0,
      model: session.model || 'N/A'
    });
  }
  res.json(sessions);
});

// 🧠 Memories
app.get('/api/memories', (req, res) => {
  const memoriesDir = path.join(HERMES_HOME, 'memories');
  const entries = [];
  try {
    const files = fs.readdirSync(memoriesDir);
    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const content = fs.readFileSync(path.join(memoriesDir, file), 'utf8');
        for (const line of content.split('\n')) {
          if (line.trim()) {
            try {
              entries.push({ ...JSON.parse(line), sourceFile: file });
            } catch {}
          }
        }
      }
    }
  } catch {}
  res.json({ entries, count: entries.length, user: entries.filter(e => e.target === 'user'), memory: entries.filter(e => e.target === 'memory') });
});

// 🛠️ Skills
app.get('/api/skills', async (req, res) => {
  try {
    // Read from skills index cache
    const cacheDir = path.join(HERMES_HOME, 'hermes-agent', 'skills', 'index-cache');
    const allSkills = [];
    
    try {
      const files = fs.readdirSync(cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = readJSON(path.join(cacheDir, file), {});
          const skills = data.skills || data;
          if (Array.isArray(skills)) {
            allSkills.push(...skills);
          }
        }
      }
    } catch {}

    // Also read from the skills directory
    const skillsDir = path.join(HERMES_HOME, 'skills');
    const categories = [];
    try {
      const subdirs = fs.readdirSync(skillsDir);
      for (const dir of subdirs) {
        const st = fs.statSync(path.join(skillsDir, dir));
        if (st.isDirectory()) {
          categories.push(dir);
          // Read SKILL.md files
          try {
            const skillDir = path.join(skillsDir, dir);
            const skillFiles = fs.readdirSync(skillDir);
            for (const sf of skillFiles) {
              if (sf.endsWith('.md') && !sf.startsWith('README')) {
                allSkills.push({
                  name: sf.replace('.md', ''),
                  category: dir,
                  source: 'local'
                });
              }
            }
          } catch {  }
        }
      }
    } catch {}

    res.json({ skills: allSkills, categories, count: allSkills.length });
  } catch (e) {
    res.json({ skills: [], categories: [], count: 0, error: e.message });
  }
});

// ⏰ Cron
app.get('/api/cron', async (req, res) => {
  try {
    const { stdout } = await runCommand('hermes cron list --json 2>/dev/null || hermes cron list 2>&1', 10000);
    let jobs = [];
    try {
      const parsed = JSON.parse(stdout);
      jobs = Array.isArray(parsed) ? parsed : (parsed.jobs || []);
    } catch {
      // 如果 CLI 不输出 JSON，返回原始输出供前端显示
      res.json({ output: stdout, jobs: [] });
      return;
    }
    res.json({ jobs });
  } catch (e) {
    res.json({ output: e.message, jobs: [] });
  }
});

// ⚙️ Config
app.get('/api/config', (req, res) => {
  const raw = parseConfig();
  res.json({
    defaultModel: raw['model.default'] || raw.default || 'N/A',
    provider: raw['model.provider'] || raw.provider || 'unknown',
    base_url: raw['model.base_url'] || raw.base_url || '',
    maxTurns: parseInt(raw.max_turns || raw['agent.max_turns'] || '60'),
    backend: raw.backend || 'local'
  });
});

// 🖥️ System
app.get('/api/system', async (req, res) => {
  try {
    const [uptime, mem, disk, load] = await Promise.all([
      runCommand('uptime -p'),
      runCommand("free -m | awk '/Mem:/{printf \"%d %d %d\", $2, $3, $7}'"),
      runCommand("df -h / | awk 'NR==2{print $2, $3, $4, $5}'"),
      runCommand("awk '{print $1, $2, $3}' /proc/loadavg")
    ]);
    const [memTotal, memUsed, memAvail] = mem.stdout.trim().split(' ').map(Number);
    const [diskTotal, diskUsed, diskAvail, diskPct] = disk.stdout.trim().split(' ');
    
    res.json({
      uptime: uptime.stdout.trim(),
      cpuLoad: load.stdout.trim(),
      memory: { total: memTotal || 0, used: memUsed || 0, available: memAvail || 0 },
      disk: { total: diskTotal, used: diskUsed, available: diskAvail, percent: diskPct },
      memoryPercent: memTotal ? Math.round(((memTotal - memAvail) / memTotal) * 100) : 0,
      diskPercent: diskPct?.replace('%', '') || 0
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// ⚡ Processes
app.get('/api/processes', async (req, res) => {
  const procs = readJSON(path.join(HERMES_HOME, 'processes.json'), []);
  const live = [];
  for (const p of procs) {
    let running = false;
    try {
      const { stdout } = await runCommand(`ps -p ${p.pid} -o pid= 2>/dev/null`);
      running = stdout.trim().length > 0;
    } catch {}
    live.push({ ...p, running });
  }
  res.json(live);
});

// ─────────────────────────────────────────────────────────────
// ⬇️  WRITE / MUTATION ROUTES (POST / PUT / DELETE)
// ─────────────────────────────────────────────────────────────

// ── Agent Control ──────────────────────────────────────────

// POST /api/agent/start
app.post('/api/agent/start', async (req, res) => {
  try {
    const { stdout, stderr } = await runCommand('hermes gateway start', 30000);
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// POST /api/agent/stop
app.post('/api/agent/stop', async (req, res) => {
  try {
    const { stdout, stderr } = await runCommand('hermes gateway stop', 15000);
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// POST /api/agent/restart
app.post('/api/agent/restart', async (req, res) => {
  try {
    const { stdout, stderr } = await runCommand('hermes gateway restart', 30000);
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// GET /api/agent/logs
app.get('/api/agent/logs', async (req, res) => {
  try {
    const { stdout } = await runCommand('hermes status', 15000);
    res.json({ output: stdout });
  } catch (e) {
    res.status(500).json({ error: e.message, stderr: e.stderr });
  }
});

// ── Chat ───────────────────────────────────────────────────

// GET /api/chat/sessions — 从 CLI 获取会话列表
app.get('/api/chat/sessions', async (req, res) => {
  try {
    const { stdout } = await runCommand('hermes sessions list --json 2>/dev/null || hermes sessions list 2>&1', 15000);
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      // 如果 CLI 不输出 JSON，则回退到文件读取
      const sessionsFile = path.join(HERMES_HOME, 'sessions', 'sessions.json');
      parsed = readJSON(sessionsFile, {});
    }
    res.json({ output: stdout, parsed });
  } catch (e) {
    // 即使 CLI 失败也回退到本地文件
    try {
      const sessionsFile = path.join(HERMES_HOME, 'sessions', 'sessions.json');
      res.json({ output: '', parsed: readJSON(sessionsFile, {}), error: e.message });
    } catch (e2) {
      res.status(500).json({ error: e.message });
    }
  }
});

// GET /api/chat/messages?sessionId=xxx — 读取会话中的消息
app.get('/api/chat/messages', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId query parameter is required' });
  }

  // 策略1：查找匹配的 session JSON 文件
  const sessionsDir = path.join(HERMES_HOME, 'sessions');
  try {
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = readJSON(path.join(sessionsDir, file), {});
        if (data.session_id === sessionId || data.session_key === sessionId ||
            file.includes(sessionId.replace(/-/g, '_'))) {
          const messages = data.messages || [];
          return res.json({ sessionId, messages, source: file, count: messages.length });
        }
      } catch {}
    }
  } catch {}

  // 策略2：从 sessions.json 主文件中查找
  try {
    const sessionsFile = path.join(HERMES_HOME, 'sessions', 'sessions.json');
    const allSessions = readJSON(sessionsFile, {});
    for (const [key, session] of Object.entries(allSessions)) {
      if (session && (session.session_id === sessionId || key === sessionId)) {
        return res.json({ sessionId, messages: session.messages || [], source: 'sessions.json', count: session.messages?.length || 0 });
      }
    }
  } catch {}

  res.json({ sessionId, messages: [], count: 0, warning: 'Session not found in any data source' });
});

// POST /api/chat/send — 发送消息
app.post('/api/chat/send', async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required', body: req.body });
  }
  // 安全处理消息内容
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeMessage = message.replace(/["`$]/g, ' ');
  try {
    const { stdout, stderr } = await runCommand(
      `echo "${safeMessage}" | hermes chat --resume ${safeSessionId}`,
      60000
    );
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// ── Session Management ────────────────────────────────────

// DELETE /api/sessions/:id
app.delete('/api/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  try {
    const { stdout, stderr } = await runCommand(`hermes sessions delete ${safeId}`, 15000);
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// PUT /api/sessions/:id/rename
app.put('/api/sessions/:id/rename', async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeTitle = title.replace(/["`;]/g, ' ');
  try {
    const { stdout, stderr } = await runCommand(
      `hermes sessions rename ${safeId} --title "${safeTitle}"`,
      15000
    );
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// POST /api/sessions/export/:id
app.post('/api/sessions/export/:id', async (req, res) => {
  const { id } = req.params;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  try {
    const { stdout, stderr } = await runCommand(`hermes sessions export ${safeId}`, 30000);
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// DELETE /api/sessions/bulk — 批量删除
app.delete('/api/sessions/bulk', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' });
  }
  const results = [];
  for (const id of ids) {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    try {
      await runCommand(`hermes sessions delete ${safeId}`, 15000);
      results.push({ id, success: true });
    } catch (e) {
      results.push({ id, success: false, error: e.message });
    }
  }
  res.json({ success: true, results, total: ids.length, deleted: results.filter(r => r.success).length });
});

// ── Skills ────────────────────────────────────────────────

// GET /api/skills/detail/:name — 读取 SKILL.md 内容
app.get('/api/skills/detail/:name', (req, res) => {
  const { name } = req.params;
  // 在所有子目录中查找
  const skillsDir = path.join(HERMES_HOME, 'skills');
  let found = null;

  try {
    const subdirs = fs.readdirSync(skillsDir);
    for (const dir of subdirs) {
      const skillFile = path.join(skillsDir, dir, `${name}.md`);
      try {
        if (fs.existsSync(skillFile)) {
          found = { name, category: dir, content: fs.readFileSync(skillFile, 'utf8'), path: skillFile };
          break;
        }
      } catch {}
    }
  } catch {}

  if (!found) {
    // Try as filename directly
    const directFile = path.join(skillsDir, `${name}.md`);
    if (fs.existsSync(directFile)) {
      found = { name, category: 'root', content: fs.readFileSync(directFile, 'utf8'), path: directFile };
    }
  }

  if (found) {
    res.json(found);
  } else {
    res.status(404).json({ error: `Skill '${name}' not found` });
  }
});

// POST /api/skills/install
app.post('/api/skills/install', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  const safeName = name.replace(/[^a-zA-Z0-9_./-]/g, '');
  try {
    const { stdout, stderr } = await runCommand(`hermes skills install ${safeName}`, 60000);
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// POST /api/skills/uninstall/:name
app.post('/api/skills/uninstall/:name', async (req, res) => {
  const { name } = req.params;
  const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, '');
  try {
    const { stdout, stderr } = await runCommand(`hermes skills uninstall ${safeName}`, 30000);
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// PUT /api/skills/:name/enable
app.put('/api/skills/:name/enable', async (req, res) => {
  const { name } = req.params;
  const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, '');
  try {
    const { stdout, stderr } = await runCommand(`hermes skills config ${safeName} --enable`, 15000);
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// PUT /api/skills/:name/disable
app.put('/api/skills/:name/disable', async (req, res) => {
  const { name } = req.params;
  const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, '');
  try {
    const { stdout, stderr } = await runCommand(`hermes skills config ${safeName} --disable`, 15000);
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// ── Memory Management ────────────────────────────────────

// PUT /api/memories/:id — 替换记忆内容
app.put('/api/memories/:id', (req, res) => {
  const { id } = req.params;
  const { content, old_content } = req.body;
  if (content === undefined && old_content === undefined) {
    return res.status(400).json({ error: 'content or old_content is required' });
  }

  // id 格式: "filename.jsonl:lineNumber" 或 直接是目标文件名
  const parts = id.split(':');
  const fileName = parts[0];
  const lineNumber = parts.length > 1 ? parseInt(parts[1], 10) : null;

  const targetFile = path.join(HERMES_HOME, 'memories', fileName.endsWith('.jsonl') ? fileName : `${fileName}.jsonl`);

  try {
    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: `Memory file '${fileName}' not found` });
    }

    const lines = fs.readFileSync(targetFile, 'utf8').split('\n');
    let modified = false;

    if (lineNumber !== null && lineNumber < lines.length) {
      // 替换指定行
      const entry = JSON.parse(lines[lineNumber]);
      if (content !== undefined) {
        entry.content = content;
      } else if (old_content && content !== undefined) {
        entry.content = entry.content.replace(old_content, content);
      }
      lines[lineNumber] = JSON.stringify(entry);
      modified = true;
    } else if (old_content) {
      // 查找并替换第一个匹配的内容
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() && lines[i].includes(old_content)) {
          try {
            const entry = JSON.parse(lines[i]);
            entry.content = entry.content.replace(old_content, content);
            lines[i] = JSON.stringify(entry);
            modified = true;
            break;
          } catch {}
        }
      }
    } else if (content !== undefined && lines.length > 0) {
      // 替换第一个非空行的 content
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim()) {
          try {
            const entry = JSON.parse(lines[i]);
            entry.content = content;
            lines[i] = JSON.stringify(entry);
            modified = true;
            break;
          } catch {}
        }
      }
    }

    if (modified) {
      fs.writeFileSync(targetFile, lines.join('\n'), 'utf8');
      res.json({ success: true, file: fileName });
    } else {
      res.status(400).json({ success: false, error: 'No matching entry found to update' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/memories/:id — 删除记忆条目
app.delete('/api/memories/:id', (req, res) => {
  const { id } = req.params;
  // id 格式: "filename.jsonl:lineNumber"
  const parts = id.split(':');
  const fileName = parts[0];
  const lineNumber = parts.length > 1 ? parseInt(parts[1], 10) : null;

  const targetFile = path.join(HERMES_HOME, 'memories', fileName.endsWith('.jsonl') ? fileName : `${fileName}.jsonl`);

  try {
    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: `Memory file '${fileName}' not found` });
    }

    const lines = fs.readFileSync(targetFile, 'utf8').split('\n');
    const originalCount = lines.filter(l => l.trim()).length;

    if (lineNumber !== null && lineNumber < lines.length) {
      lines.splice(lineNumber, 1);
    } else {
      // 如果只有一个条目，清空文件
      if (originalCount === 1) {
        fs.writeFileSync(targetFile, '', 'utf8');
        return res.json({ success: true, file: fileName, deleted: 1 });
      }
      res.status(400).json({ error: 'lineNumber required when file has multiple entries' });
      return;
    }

    fs.writeFileSync(targetFile, lines.filter(l => l.trim() || l === '').join('\n').replace(/\n{2,}/g, '\n'), 'utf8');
    res.json({ success: true, file: fileName, deleted: 1 });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/memories — 添加新记忆条目
app.post('/api/memories', (req, res) => {
  const { target, content } = req.body;
  if (!target || !content) {
    return res.status(400).json({ error: 'target and content are required' });
  }

  const safeTarget = target.replace(/[^\w.-]/g, '');
  const targetFile = path.join(HERMES_HOME, 'memories', safeTarget.endsWith('.jsonl') ? safeTarget : `${safeTarget}.jsonl`);

  try {
    const entry = {
      target,
      content,
      timestamp: new Date().toISOString(),
      added: Math.floor(Date.now() / 1000)
    };

    if (!fs.existsSync(path.dirname(targetFile))) {
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    }

    // 追加写入
    fs.appendFileSync(targetFile, JSON.stringify(entry) + '\n', 'utf8');
    res.json({ success: true, file: targetFile, entry });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Cron Management ──────────────────────────────────────

// POST /api/cron/create
app.post('/api/cron/create', async (req, res) => {
  const { name, schedule, prompt, deliver } = req.body;
  if (!schedule || !prompt) {
    return res.status(400).json({ error: 'schedule and prompt are required' });
  }
  const safeSchedule = schedule.replace(/[^a-zA-Z0-9_ *,/]/g, '');
  const safePrompt = prompt.replace(/["`$\\]/g, ' ');
  const safeName = name ? name.replace(/[^a-zA-Z0-9\u4e00-\u9fff\s_-]/g, '') : 'unnamed';
  const safeDeliver = (deliver || 'origin').replace(/[^a-zA-Z0-9_:/-]/g, '');

  try {
    const cmd = `hermes cron create --schedule "${safeSchedule}" --deliver "${safeDeliver}" --name "${safeName}" "${safePrompt}"`;
    const { stdout, stderr } = await runCommand(cmd, 15000);
    res.json({ success: true, output: stdout, error: stderr });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/cron/pause/:id
app.post('/api/cron/pause/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { stdout } = await runCommand(`hermes cron pause ${id}`, 10000);
    res.json({ success: true, output: stdout });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/cron/resume/:id
app.post('/api/cron/resume/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { stdout } = await runCommand(`hermes cron resume ${id}`, 10000);
    res.json({ success: true, output: stdout });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/cron/remove/:id
app.post('/api/cron/remove/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { stdout } = await runCommand(`hermes cron remove ${id}`, 10000);
    res.json({ success: true, output: stdout });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Channel Management ────────────────────────────────────

// POST /api/channels/:platform/connect
app.post('/api/channels/:platform/connect', async (req, res) => {
  const { platform } = req.params;
  const safePlatform = platform.replace(/[^a-zA-Z0-9_-]/g, '');
  try {
    const { stdout } = await runCommand('hermes gateway restart', 30000);
    res.json({ success: true, output: stdout, message: `${safePlatform} 已尝试连接` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/channels/:platform/disconnect
app.post('/api/channels/:platform/disconnect', async (req, res) => {
  const { platform } = req.params;
  const configPath = path.join(HERMES_HOME, 'config.yaml');
  try {
    let content = fs.readFileSync(configPath, 'utf8');
    const platformKeys = { telegram: 'telegram_token', feishu: 'feishu_app_id', discord: 'discord_token' };
    const key = platformKeys[platform];
    if (key) {
      const regex = new RegExp(`^(${key}\\s*:)`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, '# $1');
        fs.writeFileSync(configPath, content, 'utf8');
        res.json({ success: true, message: `${platform} 已禁用` });
      } else {
        res.json({ success: false, error: `${platform} 配置未找到` });
      }
    } else {
      res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Config Management ────────────────────────────────────

// PUT /api/config
app.put('/api/config', (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Updates must be an object' });
  }
  const configPath = path.join(HERMES_HOME, 'config.yaml');
  try {
    let content = fs.readFileSync(configPath, 'utf8');
    for (const [key, value] of Object.entries(updates)) {
      const safeValue = String(value).replace(/["'\\]/g, '');
      // Try nested key format (e.g. model.default or agent.max_turns)
      if (key.includes('.')) {
        const [section, field] = key.split('.', 2);
        const regex = new RegExp(`^(\\s+)(${field}\\s*:\\s*).*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `$1$2"${safeValue}"`);
        } else {
          content += `\n  ${field}: "${safeValue}"`;
        }
      } else if (key.includes('_')) {
        const regex = new RegExp(`^(${key}\\s*:\\s*).*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `$1"${safeValue}"`);
        } else {
          content += `\n${key}: "${safeValue}"`;
        }
      }
    }
    fs.writeFileSync(configPath, content, 'utf8');
    res.json({ success: true, updated: Object.keys(updates) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/models
app.get('/api/models', async (req, res) => {
  try {
    const config = parseConfig();
    const knownModels = [
      'claude-sonnet-4-20250514', 'claude-opus-4-20250416',
      'gpt-4o', 'gpt-4o-mini', 'gpt-5',
      'qwen/qwen3.5-sonar', 'qwen/qwen3.6-plus', 'qwen/qwen3-max',
      'gpt-oss-120b', 'gemini-2.5-flash'
    ];
    res.json({ 
      current: config['model.default'] || config.default || 'N/A', 
      provider: config['model.provider'] || config.provider || 'unknown', 
      available: knownModels 
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/config/model
app.put('/api/config/model', async (req, res) => {
  const { model, provider } = req.body;
  if (!model) return res.status(400).json({ error: 'model is required' });
  try {
    const configPath = path.join(HERMES_HOME, 'config.yaml');
    let content = fs.readFileSync(configPath, 'utf8');
    const safeModel = model.replace(/[^a-zA-Z0-9._-]/g, '');
    content = content.replace(/^(default\s*:\s*).*/m, `$1"${safeModel}"`);
    if (provider) {
      const safeProvider = provider.replace(/[^a-zA-Z0-9_-]/g, '');
      content = content.replace(/^(provider\s*:\s*).*/m, `$1"${safeProvider}"`);
    }
    fs.writeFileSync(configPath, content, 'utf8');
    res.json({ success: true, model: safeModel });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Start ────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
 console.log(`🚀 Hermes API Server running on http://0.0.0.0:${PORT}`);
 console.log(`📡 WebSocket Server ready on ws://0.0.0.0:${PORT}`);
 console.log(`📁 Data source: ${HERMES_HOME}`);
});

