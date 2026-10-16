/**
 * ============================================================================
 * SQLite Database Connection & Schema Layer
 * ============================================================================
 * Handles persistent task storage, table initialization, and parameterized query helpers.
 *
 * Environment Handling:
 * - Vercel Serverless: Uses /tmp/deadlines.db because the Vercel filesystem is read-only.
 * - Local / Self-Hosted: Uses ./backend/deadlines.db.
 * ============================================================================
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { getInitialTasks } = require('./services/mockData');

// Determine database path based on deployment platform
const DB_PATH = process.env.DATABASE_PATH || (
  process.env.VERCEL ? path.join('/tmp', 'deadlines.db') : path.join(__dirname, 'deadlines.db')
);

// Ensure storage directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open SQLite database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log(`Connected to SQLite database at ${DB_PATH}`);
  }
});

/**
 * Execute a parameterized write query (INSERT, UPDATE, DELETE).
 * @param {string} sql - SQL query string with ? placeholders
 * @param {Array} params - Bound parameter values
 * @returns {Promise<{lastID: number, changes: number}>}
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Execute a parameterized query returning a single row.
 * @param {string} sql - SQL query string with ? placeholders
 * @param {Array} params - Bound parameter values
 * @returns {Promise<Object|null>}
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Execute a parameterized query returning all matching rows.
 * @param {string} sql - SQL query string with ? placeholders
 * @param {Array} params - Bound parameter values
 * @returns {Promise<Array<Object>>}
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Initialize database tables and seed sample student directives if table is empty.
 */
async function initDb() {
  // Table 1: Deadline Tasks (actionable items extracted from academic notices)
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

  // Table 2: Email Logs (audit trail of processed email headers)
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

  // Table 3: User Settings (preferences for Telegram, calendar sync, and digests)
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

  // Seed initial tasks if table is empty (ensures rich UI on first launch)
  const countRow = await get('SELECT COUNT(*) as count FROM deadline_tasks');
  if (!countRow || countRow.count === 0) {
    console.log('Seeding initial tasks into database...');
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
    console.log(`Seeded ${initialTasks.length} initial tasks.`);
  }
}

/**
 * Safely closes the database connection on server shutdown.
 */
function closeDb() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = {
  db,
  DB_PATH,
  run,
  get,
  all,
  initDb,
  closeDb
};
