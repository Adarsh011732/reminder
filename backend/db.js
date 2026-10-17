/**
 * ============================================================================
 * Universal Database Layer (SQLite + Pure-JS In-Memory Engine)
 * ============================================================================
 * Provides persistent SQLite storage when native bindings and filesystem are available,
 * and automatically fails over to a high-performance in-memory engine on Vercel Serverless
 * where native C++ binaries are not compiled.
 * ============================================================================
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { getInitialTasks } = require('./services/mockData');

// Dynamically check if native sqlite3 is loadable
let sqlite3 = null;
try {
  const reqSqlite = require('sqlite3');
  sqlite3 = reqSqlite.verbose ? reqSqlite.verbose() : reqSqlite;
} catch (nativeErr) {
  console.warn('[DB] Native sqlite3 module not available in this environment, using in-memory engine.');
}

// In-Memory Storage Engine (Zero Native Dependencies)
class MemoryStore {
  constructor() {
    this.tasks = [];
    this.emailLogs = [];
    this.settings = [];
    this.taskIdSeq = 1;
    this.emailLogIdSeq = 1;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    const initial = getInitialTasks();
    for (const t of initial) {
      this.tasks.push({
        id: this.taskIdSeq++,
        title: t.title,
        category: t.category || 'other',
        action_required: t.action_required,
        deadline_iso: t.deadline_iso,
        deadline_text_raw: t.deadline_text_raw,
        deadline_exact: t.deadline_exact !== false ? 1 : 0,
        primary_link: t.primary_link,
        sender: t.sender,
        source_subject: t.source_subject,
        raw_snippet: t.raw_snippet,
        urgency_tier: t.urgency_tier || 'green',
        status: t.status || 'active',
        priority_score: t.priority_score || 3,
        confidence: t.confidence || 0.95,
        email_thread_id: t.email_thread_id,
        snoozed_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    this.isInitialized = true;
  }

  async run(sql, params = []) {
    await this.init();
    const cleanSql = sql.replace(/\s+/g, ' ').trim();

    // INSERT INTO deadline_tasks
    if (/^INSERT INTO deadline_tasks/i.test(cleanSql)) {
      const id = this.taskIdSeq++;
      const [
        title, category, action_required, deadline_iso, deadline_text_raw,
        deadline_exact, primary_link, sender, source_subject, raw_snippet,
        urgency_tier, status, priority_score, confidence, email_thread_id
      ] = params;

      this.tasks.push({
        id,
        title,
        category: category || 'other',
        action_required,
        deadline_iso,
        deadline_text_raw,
        deadline_exact: deadline_exact ? 1 : 0,
        primary_link,
        sender,
        source_subject,
        raw_snippet,
        urgency_tier: urgency_tier || 'green',
        status: status || 'active',
        priority_score: priority_score || 3,
        confidence: confidence || 0.95,
        email_thread_id,
        snoozed_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      return { lastID: id, changes: 1 };
    }

    // UPDATE deadline_tasks SET status = ?, updated_at = ... WHERE id = ?
    if (/^UPDATE deadline_tasks SET status = \?, updated_at = CURRENT_TIMESTAMP WHERE id = \?/i.test(cleanSql)) {
      const [status, id] = params;
      const t = this.tasks.find(x => x.id === Number(id));
      if (t) {
        t.status = status;
        t.updated_at = new Date().toISOString();
        return { lastID: t.id, changes: 1 };
      }
      return { lastID: 0, changes: 0 };
    }

    // UPDATE deadline_tasks SET status = ?, snoozed_until = ?, updated_at = ... WHERE id = ?
    if (/snoozed_until/i.test(cleanSql) && /WHERE id = \?/i.test(cleanSql)) {
      const t = this.tasks.find(x => x.id === Number(params[params.length - 1]));
      if (t) {
        t.status = params[0];
        t.snoozed_until = params[1];
        t.updated_at = new Date().toISOString();
        return { lastID: t.id, changes: 1 };
      }
      return { lastID: 0, changes: 0 };
    }

    // UPDATE deadline_tasks SET urgency_tier = ?, updated_at = ... WHERE id = ?
    if (/urgency_tier = \?/i.test(cleanSql) && /WHERE id = \?/i.test(cleanSql)) {
      const [newUrgency, id] = params;
      const t = this.tasks.find(x => x.id === Number(id));
      if (t) {
        t.urgency_tier = newUrgency;
        t.updated_at = new Date().toISOString();
        return { lastID: t.id, changes: 1 };
      }
      return { lastID: 0, changes: 0 };
    }

    // DELETE FROM deadline_tasks WHERE id = ?
    if (/^DELETE FROM deadline_tasks WHERE id = \?/i.test(cleanSql)) {
      const id = Number(params[0]);
      const idx = this.tasks.findIndex(x => x.id === id);
      if (idx !== -1) {
        this.tasks.splice(idx, 1);
        return { lastID: id, changes: 1 };
      }
      return { lastID: 0, changes: 0 };
    }

    // INSERT INTO email_logs
    if (/email_logs/i.test(cleanSql)) {
      const id = this.emailLogIdSeq++;
      this.emailLogs.push({
        id,
        message_id: params[0],
        sender: params[1],
        subject: params[2],
        is_actionable: params[3],
        extracted_task_id: params[4],
        raw_body: params[5],
        received_at: new Date().toISOString()
      });
      return { lastID: id, changes: 1 };
    }

    // Generic DDL (CREATE TABLE etc.) - no-op for memory store
    return { lastID: 0, changes: 0 };
  }

  async get(sql, params = []) {
    await this.init();
    const cleanSql = sql.replace(/\s+/g, ' ').trim();

    // SELECT COUNT(*) as count FROM deadline_tasks
    if (/COUNT\(\*\)/i.test(cleanSql) && /deadline_tasks/i.test(cleanSql)) {
      return { count: this.tasks.length };
    }

    // SELECT * FROM deadline_tasks WHERE id = ?
    if (/FROM deadline_tasks WHERE id = \?/i.test(cleanSql)) {
      const t = this.tasks.find(x => x.id === Number(params[0]));
      return t ? { ...t } : null;
    }

    // SELECT id FROM email_logs WHERE message_id = ?
    if (/FROM email_logs WHERE message_id = \?/i.test(cleanSql)) {
      const log = this.emailLogs.find(x => x.message_id === String(params[0]));
      return log ? { id: log.id } : null;
    }

    return null;
  }

  async all(sql, params = []) {
    await this.init();
    const cleanSql = sql.replace(/\s+/g, ' ').trim();

    // SELECT * FROM deadline_tasks
    if (/FROM deadline_tasks/i.test(cleanSql)) {
      let result = [...this.tasks];

      // Parse status, category, urgency, search from params
      let paramIdx = 0;
      if (/status = \?/i.test(cleanSql) && params[paramIdx]) {
        const targetStatus = params[paramIdx++];
        result = result.filter(t => t.status === targetStatus);
      }
      if (/category = \?/i.test(cleanSql) && params[paramIdx]) {
        const targetCategory = params[paramIdx++];
        result = result.filter(t => t.category === targetCategory);
      }
      if (/LIKE \?/i.test(cleanSql) && params[paramIdx]) {
        const rawPattern = String(params[paramIdx]).replace(/%/g, '').toLowerCase();
        result = result.filter(t =>
          (t.title && t.title.toLowerCase().includes(rawPattern)) ||
          (t.action_required && t.action_required.toLowerCase().includes(rawPattern)) ||
          (t.sender && t.sender.toLowerCase().includes(rawPattern))
        );
      }

      // Sort by deadline_iso ASC
      result.sort((a, b) => {
        if (!a.deadline_iso) return 1;
        if (!b.deadline_iso) return -1;
        return new Date(a.deadline_iso).getTime() - new Date(b.deadline_iso).getTime();
      });

      return result.map(t => ({ ...t }));
    }

    return [];
  }
}

// Global Memory Store Instance
const memoryStore = new MemoryStore();

// Setup SQLite fallback if native binary is present
let sqliteDb = null;
let activeEngine = 'memory';
let DB_PATH = ':memory:';

if (sqlite3) {
  try {
    const isCloud = Boolean(
      process.env.VERCEL ||
      process.env.NOW_REGION ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NODE_ENV === 'production'
    );

    DB_PATH = process.env.DATABASE_PATH || (
      isCloud ? path.join(os.tmpdir(), 'deadlines.db') : path.join(__dirname, 'deadlines.db')
    );

    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.warn('[DB] SQLite file creation failed, keeping memory engine:', err.message);
        activeEngine = 'memory';
      } else {
        activeEngine = 'sqlite';
        console.log(`[DB] Connected to SQLite database at ${DB_PATH}`);
      }
    });
  } catch (err) {
    console.warn('[DB] SQLite init exception, falling back to in-memory store:', err.message);
    activeEngine = 'memory';
  }
}

// Query Helpers routing to Active Engine
function run(sql, params = []) {
  if (activeEngine === 'sqlite' && sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
  return memoryStore.run(sql, params);
}

function get(sql, params = []) {
  if (activeEngine === 'sqlite' && sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }
  return memoryStore.get(sql, params);
}

function all(sql, params = []) {
  if (activeEngine === 'sqlite' && sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
  return memoryStore.all(sql, params);
}

let initPromise = null;

async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (activeEngine === 'sqlite' && sqliteDb) {
      await run(`
        CREATE TABLE IF NOT EXISTS deadline_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(50) DEFAULT 'other',
          action_required VARCHAR(255) NOT NULL,
          deadline_iso DATETIME,
          deadline_text_raw VARCHAR(100),
          deadline_exact BOOLEAN DEFAULT 1,
          primary_link TEXT,
          sender VARCHAR(255),
          source_subject VARCHAR(255),
          raw_snippet TEXT,
          urgency_tier VARCHAR(20) DEFAULT 'green',
          status VARCHAR(20) DEFAULT 'active',
          priority_score INTEGER DEFAULT 3,
          confidence FLOAT DEFAULT 0.9,
          email_thread_id VARCHAR(100),
          snoozed_until DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS email_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id VARCHAR(100) UNIQUE,
          sender VARCHAR(255) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_actionable BOOLEAN DEFAULT 0,
          extracted_task_id INTEGER,
          raw_body TEXT
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_chat_id VARCHAR(100),
          telegram_enabled BOOLEAN DEFAULT 1,
          calendar_sync_enabled BOOLEAN DEFAULT 0,
          daily_digest_time VARCHAR(10) DEFAULT '08:00',
          whitelist_senders TEXT DEFAULT 'placement@college.edu,iipc@college.edu,hod.cse@college.edu,notices@college.edu'
        )
      `);

      const countRow = await get('SELECT COUNT(*) as count FROM deadline_tasks');
      if (!countRow || countRow.count === 0) {
        const initialTasks = getInitialTasks();
        for (const t of initialTasks) {
          await run(`
            INSERT INTO deadline_tasks (
              title, category, action_required, deadline_iso, deadline_text_raw,
              deadline_exact, primary_link, sender, source_subject, raw_snippet,
              urgency_tier, status, priority_score, confidence, email_thread_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            t.title, t.category, t.action_required, t.deadline_iso, t.deadline_text_raw,
            t.deadline_exact, t.primary_link, t.sender, t.source_subject, t.raw_snippet,
            t.urgency_tier, t.status, t.priority_score, t.confidence, t.email_thread_id
          ]);
        }
      }
    } else {
      await memoryStore.init();
    }
  })().catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}

function closeDb() {
  return new Promise((resolve) => {
    if (sqliteDb) {
      sqliteDb.close(() => resolve());
    } else {
      resolve();
    }
  });
}

module.exports = {
  db: sqliteDb,
  DB_PATH,
  activeEngine,
  run,
  get,
  all,
  initDb,
  closeDb
};
