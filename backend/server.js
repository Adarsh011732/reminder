const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const { db, run, get, all, initDb, closeDb } = require('./db');
const { computeUrgencyTier, extractDeadlineFromEmail } = require('./services/aiExtractor');
const { executePythonExtractor } = require('./services/pythonBridge');
const { testImapConnection, fetchAndProcessRealEmails } = require('./services/imapService');
const { SAMPLE_STUDENT_EMAILS } = require('./services/mockData');

const app = express();
const PORT = process.env.PORT || 8000;
const FRONTEND_DIST = path.resolve(__dirname, '../frontend/dist');
const HAS_FRONTEND = fs.existsSync(FRONTEND_DIST);

// 1. Disable information disclosure headers
app.disable('x-powered-by');

// 2. HTTP Security Headers (Defends against clickjacking, MIME sniffing, XSS, and forces HTTPS)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// 3. In-Memory Sliding-Window Rate Limiter (Defends against brute-force and DoS)
const rateLimitMap = new Map();
function createRateLimiter({ windowMs = 60 * 1000, max = 100, message = 'Too many requests. Please slow down.' }) {
  return (req, res, next) => {
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const key = `${rawIp}:${req.baseUrl || req.path}`;

    // Periodic garbage collection
    if (rateLimitMap.size > 5000) {
      for (const [k, v] of rateLimitMap.entries()) {
        if (now > v.resetTime) rateLimitMap.delete(k);
      }
    }

    const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }
    rateLimitMap.set(key, record);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too Many Requests',
        detail: message,
        retry_after_seconds: retryAfter
      });
    }
    next();
  };
}

const generalLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120 });
const sensitiveLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20, message: 'Too many authentication/sync attempts. Please wait 60 seconds.' });

// 4. Strict CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*' ? '*' : allowedOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 5. Restrict request body buffer limit to prevent memory-exhaustion DoS
app.use(express.json({ limit: '500kb' }));

// Apply rate limiters
app.use('/api/', generalLimiter);
app.use('/api/mailbox/', sensitiveLimiter);
app.use('/api/telegram/', sensitiveLimiter);
app.use('/api/deadlines/parse-raw', sensitiveLimiter);
app.use('/api/python/', sensitiveLimiter);

// Cloud Health Check Endpoints (for Render, Fly.io, Kubernetes, Docker, Railway)
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'Student Deadline Radar'
  });
});

// Serve frontend static files in production when dist exists
if (HAS_FRONTEND) {
  app.use(express.static(FRONTEND_DIST));
}

// Root route: Serve frontend index.html if built, otherwise API status JSON
app.get('/', (req, res) => {
  if (HAS_FRONTEND) {
    return res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  }
  res.json({
    status: 'online',
    service: 'Student Deadline Tracker API (Node.js & Python Hybrid)',
    version: '1.0.0',
    python_models_supported: true,
    engine: 'Node.js Express + Python Bridge + SQLite'
  });
});

// GET /api/deadlines - With input validation & parameterization
const VALID_STATUSES = ['all', 'active', 'done', 'snoozed'];
const VALID_CATEGORIES = ['all', 'registration', 'hackathon', 'placement', 'feedback', 'exam', 'assignment', 'event', 'form', 'other'];
const VALID_URGENCIES = ['all', 'red', 'yellow', 'green', 'overdue'];

app.get('/api/deadlines', async (req, res) => {
  try {
    const rawStatus = (req.query.status || 'active').toLowerCase().trim();
    const rawCategory = (req.query.category || 'all').toLowerCase().trim();
    const rawUrgency = (req.query.urgency || 'all').toLowerCase().trim();
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.slice(0, 100).trim() : '';

    const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'active';
    const category = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : 'all';
    const urgency = VALID_URGENCIES.includes(rawUrgency) ? rawUrgency : 'all';

    let sql = 'SELECT * FROM deadline_tasks WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (rawSearch) {
      const pattern = `%${rawSearch}%`;
      sql += ' AND (title LIKE ? OR action_required LIKE ? OR sender LIKE ?)';
      params.push(pattern, pattern, pattern);
    }

    sql += ' ORDER BY deadline_iso ASC';

    const tasks = await all(sql, params);

    // Dynamically update urgency tiers
    for (const task of tasks) {
      if (task.deadline_iso && task.status === 'active') {
        const newUrgency = computeUrgencyTier(task.deadline_iso);
        if (task.urgency_tier !== newUrgency) {
          task.urgency_tier = newUrgency;
          await run('UPDATE deadline_tasks SET urgency_tier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
            newUrgency,
            task.id
          ]);
        }
      }
    }

    // Filter by urgency if specified
    let filteredTasks = tasks;
    if (urgency && urgency !== 'all') {
      filteredTasks = tasks.filter(t => t.urgency_tier === urgency);
    }

    res.json(filteredTasks);
  } catch (err) {
    console.error('Error fetching deadlines:', err.message);
    res.status(500).json({ detail: process.env.NODE_ENV === 'production' ? 'Failed to fetch deadlines' : err.message });
  }
});

// POST /api/deadlines/parse-raw
app.post('/api/deadlines/parse-raw', async (req, res) => {
  try {
    const { subject = '', sender = '', body = '', sent_at = null } = req.body;
    const autoSave = req.query.auto_save === 'true' || req.body.auto_save === true;
    const usePython = req.query.use_python === 'true' || req.body.use_python === true;

    let extracted;
    if (usePython) {
      // Execute via Python Model Bridge
      try {
        extracted = await executePythonExtractor({ subject, sender, body, sent_at });
      } catch (pyErr) {
        console.warn('Python model bridge error, falling back to Node AI extractor:', pyErr.message);
        extracted = await extractDeadlineFromEmail(subject, sender, body, sent_at);
      }
    } else {
      extracted = await extractDeadlineFromEmail(subject, sender, body, sent_at);
    }

    let savedTask = null;
    if (autoSave && extracted && extracted.is_actionable) {
      const deadlineVal = extracted.deadline_iso || null;
      const urgency = computeUrgencyTier(deadlineVal);

      const deterministicThreadId = crypto
        .createHash('sha256')
        .update(`${subject}:${sender}:${sent_at || Date.now()}`)
        .digest('hex')
        .substring(0, 32);

      const insertResult = await run(`
        INSERT INTO deadline_tasks (
          title, category, action_required, deadline_iso, deadline_text_raw,
          deadline_exact, primary_link, sender, source_subject, raw_snippet,
          urgency_tier, status, priority_score, confidence, email_thread_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        extracted.title || subject,
        extracted.category || 'other',
        extracted.action_required || 'Check email details',
        deadlineVal,
        extracted.deadline_text_raw || null,
        extracted.deadline_exact !== false ? 1 : 0,
        extracted.primary_link || null,
        sender,
        subject,
        body.substring(0, 200),
        urgency,
        'active',
        extracted.priority_score || 3,
        extracted.confidence || 0.95,
        deterministicThreadId
      ]);

      savedTask = await get('SELECT * FROM deadline_tasks WHERE id = ?', [insertResult.lastID]);
    }

    res.json({
      extracted,
      saved_task: savedTask
    });
  } catch (err) {
    console.error('Error parsing raw email:', err.message);
    res.status(500).json({ detail: process.env.NODE_ENV === 'production' ? 'Failed to parse raw email' : err.message });
  }
});

// PATCH /api/deadlines/:id/action - Strict validation & parameterization
const ALLOWED_TASK_ACTIONS = ['done', 'snooze_24h', 'reactivate', 'delete'];

app.patch('/api/deadlines/:id/action', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ detail: 'Invalid task ID. Must be a positive integer.' });
    }

    const { action } = req.body || {};
    if (!action || !ALLOWED_TASK_ACTIONS.includes(action)) {
      return res.status(400).json({ detail: `Invalid action. Allowed: ${ALLOWED_TASK_ACTIONS.join(', ')}` });
    }

    const task = await get('SELECT * FROM deadline_tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }

    if (action === 'done') {
      await run('UPDATE deadline_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['done', taskId]);
    } else if (action === 'snooze_24h') {
      const snoozeUntil = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      await run('UPDATE deadline_tasks SET status = ?, snoozed_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        'snoozed',
        snoozeUntil,
        taskId
      ]);
    } else if (action === 'reactivate') {
      await run('UPDATE deadline_tasks SET status = ?, snoozed_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        'active',
        taskId
      ]);
    } else if (action === 'delete') {
      await run('DELETE FROM deadline_tasks WHERE id = ?', [taskId]);
      return res.json(task);
    }

    const updatedTask = await get('SELECT * FROM deadline_tasks WHERE id = ?', [taskId]);
    res.json(updatedTask);
  } catch (err) {
    console.error('Error updating task action:', err.message);
    res.status(500).json({ detail: process.env.NODE_ENV === 'production' ? 'Failed to update task' : err.message });
  }
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const tasks = await all('SELECT * FROM deadline_tasks');

    const activeTasks = tasks.filter(t => t.status === 'active');
    const completedCount = tasks.filter(t => t.status === 'done').length;

    const criticalCount = activeTasks.filter(t => t.urgency_tier === 'red' || t.urgency_tier === 'overdue').length;
    const approachingCount = activeTasks.filter(t => t.urgency_tier === 'yellow').length;
    const normalCount = activeTasks.filter(t => t.urgency_tier === 'green').length;

    const categoriesBreakdown = {};
    for (const t of activeTasks) {
      categoriesBreakdown[t.category] = (categoriesBreakdown[t.category] || 0) + 1;
    }

    res.json({
      total_active: activeTasks.length,
      critical_count: criticalCount,
      approaching_count: approachingCount,
      normal_count: normalCount,
      completed_count: completedCount,
      streak_days: 14,
      categories_breakdown: categoriesBreakdown
    });
  } catch (err) {
    console.error('Error calculating dashboard stats:', err.message);
    res.status(500).json({ detail: process.env.NODE_ENV === 'production' ? 'Failed to calculate stats' : err.message });
  }
});

// GET /api/sample-emails
app.get('/api/sample-emails', (req, res) => {
  res.json(SAMPLE_STUDENT_EMAILS);
});

// POST /api/telegram/test-alert - Validated & rate-limited
app.post('/api/telegram/test-alert', async (req, res) => {
  try {
    const { task_id, bot_token, chat_id } = req.body || {};
    const taskId = parseInt(task_id, 10);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ detail: 'Invalid task ID. Must be a positive integer.' });
    }

    const task = await get('SELECT * FROM deadline_tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }

    const emoji = task.urgency_tier === 'red' || task.urgency_tier === 'overdue'
      ? '🔴'
      : task.urgency_tier === 'yellow'
      ? '🟡'
      : '🟢';

    let dueStr = task.deadline_text_raw;
    if (!dueStr && task.deadline_iso) {
      const d = new Date(task.deadline_iso);
      dueStr = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    }
    dueStr = dueStr || 'No exact date';

    const formattedMessage = `${emoji} *DEADLINE RADAR ALERT*
━━━━━━━━━━━━━━━━━━━━
📌 *Task:* ${task.title}
⚡ *Action:* ${task.action_required}
⏰ *Due Date:* ${dueStr}
🏢 *Sender:* ${task.sender || 'College Notice'}
🔗 *Link:* ${task.primary_link || 'Check ERP Portal'}
━━━━━━━━━━━━━━━━━━━━
_Tri-Color Urgency: ${(task.urgency_tier || 'green').toUpperCase()}_`;

    let telegramApiResult = null;
    const activeToken = bot_token || process.env.TELEGRAM_BOT_TOKEN;
    const activeChatId = chat_id || process.env.TELEGRAM_CHAT_ID;

    if (activeToken && activeChatId) {
      try {
        const telegramUrl = `https://api.telegram.org/bot${activeToken.trim()}/sendMessage`;
        const payload = {
          chat_id: activeChatId.trim(),
          text: formattedMessage,
          parse_mode: 'Markdown'
        };

        if (task.primary_link) {
          payload.reply_markup = {
            inline_keyboard: [[{ text: '🔗 Open Form / Portal', url: task.primary_link }]]
          };
        }

        const resp = await axios.post(telegramUrl, payload, { timeout: 10000 });
        telegramApiResult = resp.data;
      } catch (tgErr) {
        telegramApiResult = { error: tgErr.response?.data || tgErr.message };
      }
    }

    res.json({
      status: 'success',
      live_dispatched: Boolean(telegramApiResult && telegramApiResult.ok),
      telegram_api_result: telegramApiResult,
      formatted_message: formattedMessage
    });
  } catch (err) {
    console.error('Error dispatching telegram alert:', err.message);
    res.status(500).json({ detail: process.env.NODE_ENV === 'production' ? 'Failed to dispatch alert' : err.message });
  }
});

// Helper regex for validating email and IMAP server strings
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOSTNAME_REGEX = /^[a-zA-Z0-9.-]+$/;

// POST /api/mailbox/test-connection - Validated and rate-limited
app.post('/api/mailbox/test-connection', async (req, res) => {
  try {
    const { email = '', app_password = '', imap_server = 'imap.gmail.com', port = 993 } = req.body || {};

    // Validate email
    const trimmedEmail = String(email).trim().toLowerCase();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.length > 254) {
      return res.status(400).json({ detail: { success: false, message: 'Invalid email address format.' } });
    }

    // Validate password presence
    const trimmedPass = String(app_password).trim();
    if (!trimmedPass || trimmedPass.length > 128) {
      return res.status(400).json({ detail: { success: false, message: 'App password is required.' } });
    }

    // Validate server hostname
    const trimmedServer = String(imap_server).trim().toLowerCase();
    if (!HOSTNAME_REGEX.test(trimmedServer) || trimmedServer.length > 100) {
      return res.status(400).json({ detail: { success: false, message: 'Invalid IMAP server hostname.' } });
    }

    // Validate port
    const numPort = parseInt(port, 10);
    if (!Number.isInteger(numPort) || numPort < 1 || numPort > 65535) {
      return res.status(400).json({ detail: { success: false, message: 'Invalid port. Must be between 1 and 65535.' } });
    }

    const result = await testImapConnection({
      email: trimmedEmail,
      appPassword: trimmedPass,
      server: trimmedServer,
      port: numPort
    });

    if (!result.success) {
      return res.status(400).json({ detail: result });
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ detail: { success: false, message: 'Failed to establish IMAP connection.' } });
  }
});

// POST /api/mailbox/fetch-real-emails - Validated and rate-limited
app.post('/api/mailbox/fetch-real-emails', async (req, res) => {
  try {
    const {
      email = '',
      app_password = '',
      imap_server = 'imap.gmail.com',
      port = 993,
      max_emails = 30,
      days = 30,
      search_query = 'ALL'
    } = req.body || {};

    const trimmedEmail = String(email).trim().toLowerCase();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({ detail: { success: false, message: 'Invalid email address.' } });
    }

    const trimmedPass = String(app_password).trim();
    if (!trimmedPass) {
      return res.status(400).json({ detail: { success: false, message: 'App password is required.' } });
    }

    const trimmedServer = String(imap_server).trim().toLowerCase();
    if (!HOSTNAME_REGEX.test(trimmedServer)) {
      return res.status(400).json({ detail: { success: false, message: 'Invalid IMAP server host.' } });
    }

    const numPort = parseInt(port, 10);
    if (!Number.isInteger(numPort) || numPort < 1 || numPort > 65535) {
      return res.status(400).json({ detail: { success: false, message: 'Invalid port number.' } });
    }

    // Clamp limits to protect memory and timeout bounds
    const clampedMaxEmails = Math.min(Math.max(parseInt(max_emails, 10) || 20, 1), 50);
    const clampedDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 90);
    const sanitizedSearch = String(search_query).slice(0, 50).trim() || 'ALL';

    const result = await fetchAndProcessRealEmails({
      email: trimmedEmail,
      appPassword: trimmedPass,
      server: trimmedServer,
      port: numPort,
      maxEmails: clampedMaxEmails,
      days: clampedDays,
      searchQuery: sanitizedSearch
    });

    if (!result.success) {
      return res.status(400).json({ detail: result });
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ detail: { success: false, message: 'Mailbox scan failed.' } });
  }
});

// POST /api/python/extract (Direct Python Model invocation bridge) - Validated & bounded
app.post('/api/python/extract', async (req, res) => {
  try {
    const { subject = '', sender = '', body = '', sent_at = null } = req.body || {};
    
    // Bounds check to protect child process execution
    const safeSubject = String(subject).slice(0, 300);
    const safeSender = String(sender).slice(0, 255);
    const safeBody = String(body).slice(0, 50000);

    const result = await executePythonExtractor({
      subject: safeSubject,
      sender: safeSender,
      body: safeBody,
      sent_at
    });

    res.json({
      engine: 'Python NLP Model Bridge',
      result
    });
  } catch (err) {
    console.error('Python bridge error:', err.message);
    res.status(500).json({ detail: process.env.NODE_ENV === 'production' ? 'Python model extraction failed' : err.message });
  }
});

// SPA Fallback for client-side routing (non-API routes)
if (HAS_FRONTEND) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ detail: 'API endpoint not found' });
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Global process safety handlers
process.on('uncaughtException', (err) => {
  console.warn('⚠️ Process caught unhandled exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ Process caught unhandled rejection:', reason);
});

// Start server if running as standalone process (Render, Docker, local), bypass listen in serverless (Vercel)
let serverInstance = null;
const isServerless = Boolean(process.env.VERCEL || process.env.NOW_REGION);

if (!isServerless) {
  initDb()
    .then(() => {
      serverInstance = app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 Student Deadline Radar (Node.js Backend) Running`);
        console.log(`📡 URL: http://127.0.0.1:${PORT}`);
        console.log(`🌐 Frontend Static Serving: ${HAS_FRONTEND ? 'Active (' + FRONTEND_DIST + ')' : 'Standby (Build frontend to enable)'}`);
        console.log(`🐍 Python Model Bridge: Active & Ready`);
        console.log(`====================================================`);
      });

      serverInstance.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`\n❌ Port ${PORT} is already in use by another process.`);
          console.error(`💡 Tip: Close any existing backend terminal or run: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
        } else {
          console.error('Server error:', err);
        }
      });

      // Graceful shutdown handling for container and cloud environments
      const handleShutdown = async (signal) => {
        console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
        if (serverInstance) {
          serverInstance.close(async () => {
            try {
              await closeDb();
              console.log('✅ SQLite connection closed safely.');
            } catch (dbErr) {
              console.error('Error closing SQLite:', dbErr.message);
            }
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      };

      process.on('SIGTERM', () => handleShutdown('SIGTERM'));
      process.on('SIGINT', () => handleShutdown('SIGINT'));
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
    });
}

module.exports = app;
