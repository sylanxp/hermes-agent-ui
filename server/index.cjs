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

const execAsync = promisify(exec);
const app = express();
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
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || line.startsWith(' ') || line.startsWith('\t')) continue;
      const idx = trimmed.indexOf(': ');
      if (idx > 0) {
        config[trimmed.substring(0, idx)] = trimmed.substring(idx + 2).replace(/^["']|["']$/g, '');
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
    const { stdout } = await runCommand('hermes cron list 2>&1', 10000);
    res.json({ output: stdout, raw: stdout });
  } catch (e) {
    res.json({ output: e.message, raw: '' });
  }
});

// ⚙️ Config
app.get('/api/config', (req, res) => {
  const raw = parseConfig();
  res.json({
    defaultModel: raw.default || 'N/A',
    provider: raw.provider || 'unknown',
    base_url: raw.base_url || '',
    maxTurns: parseInt(raw.max_turns || '60'),
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

// ── Start ────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Hermes API Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Data source: ${HERMES_HOME}`);
});
