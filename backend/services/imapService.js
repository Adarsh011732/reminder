const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { extractDeadlineFromEmail, computeUrgencyTier } = require('./aiExtractor');
const { run, get } = require('../db');

/**
 * Tests IMAP credentials
 */
async function testImapConnection({ email, appPassword, server = 'imap.gmail.com', port = 993 }) {
  const client = new ImapFlow({
    host: server,
    port: parseInt(port, 10),
    secure: true,
    auth: {
      user: email.trim(),
      pass: appPassword.trim()
    },
    logger: false,
    emitLogs: false
  });

  // Prevent unhandled error event from crashing Node.js process on network reset
  client.on('error', (err) => {
    console.warn('[IMAP test error caught]:', err.message);
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.status('INBOX', { messages: true, unseen: true });
      try { await client.logout(); } catch (_) {}
      return {
        success: true,
        message: 'Connected successfully to your mailbox!',
        details: `Total messages: ${status.messages}, Unseen: ${status.unseen}`
      };
    } finally {
      try { lock.release(); } catch (_) {}
    }
  } catch (err) {
    try { await client.logout(); } catch (_) {}
    return {
      success: false,
      message: `Connection failed: ${err.message}`,
      hint: 'For Gmail / Google Workspace, please generate an App Password (not your normal password) with 2-Step Verification enabled.'
    };
  }
}

/**
 * Connects to IMAP, reads recent emails with ultra-fast sequence range fetching,
 * parses content, and saves actionable deadlines to DB.
 */
async function fetchAndProcessRealEmails({
  email,
  appPassword,
  server = 'imap.gmail.com',
  port = 993,
  maxEmails = 30,
  days = 30,
  sinceDays = null,
  searchQuery = 'ALL'
}) {
  const client = new ImapFlow({
    host: server,
    port: parseInt(port, 10),
    secure: true,
    auth: {
      user: email.trim(),
      pass: appPassword.trim()
    },
    logger: false,
    emitLogs: false
  });

  // Prevent unhandled error event from crashing Node.js process on network reset
  client.on('error', (err) => {
    console.warn('[IMAP sync error caught]:', err.message);
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    const processedEmails = [];
    const actionableTasks = [];

    try {
      const totalMessages = client.mailbox ? client.mailbox.exists : 0;
      if (totalMessages === 0) {
        return {
          success: true,
          total_scanned: 0,
          actionable_found: 0,
          processed_items: [],
          message: 'Mailbox is empty.'
        };
      }

      const activeDays = parseInt(sinceDays || days, 10);
      const limitCount = Math.min(Math.max(1, parseInt(maxEmails, 10) || 30), 100);
      let fetchedMessages = [];

      if (activeDays && activeDays > 0) {
        // IMAP server-side date filtering: Fetches emails received in the last N days
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - activeDays);
        sinceDate.setHours(0, 0, 0, 0);

        const searchCriteria = { since: sinceDate };
        if (searchQuery === 'UNSEEN') {
          searchCriteria.unseen = true;
        }

        for await (const message of client.fetch(searchCriteria, {
          uid: true,
          flags: true,
          envelope: true,
          source: true
        })) {
          fetchedMessages.push(message);
        }

        // Keep the latest N emails from this 30-day period
        if (fetchedMessages.length > limitCount) {
          fetchedMessages = fetchedMessages.slice(-limitCount);
        }
      } else {
        // Fast sequence range indexing for recent emails
        const startSeq = Math.max(1, totalMessages - limitCount + 1);
        const seqRange = `${startSeq}:*`;

        for await (const message of client.fetch(seqRange, {
          uid: true,
          flags: true,
          envelope: true,
          source: true
        })) {
          fetchedMessages.push(message);
        }
      }

      // Reverse so newest are processed first
      fetchedMessages.reverse();

      // Process messages in parallel with Promise.all
      const processPromises = fetchedMessages.map(async (msg) => {
        try {
          const parsed = await simpleParser(msg.source);

          const subject = parsed.subject || 'No Subject';
          const sender = parsed.from ? parsed.from.text : 'Unknown Sender';
          const dateHeader = parsed.date ? parsed.date.toISOString() : new Date().toISOString();
          const messageId = parsed.messageId || `msg_${msg.uid}_${Date.now()}`;

          // Check if already processed in email_logs
          const existingLog = await get('SELECT id FROM email_logs WHERE message_id = ?', [messageId]);
          if (existingLog) {
            return null;
          }

          const bodyText = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]*>?/gm, ' ') : '');
          if (!bodyText.trim()) return null;

          // Run AI / heuristic extractor
          const extracted = await extractDeadlineFromEmail(
            subject,
            sender,
            bodyText.substring(0, 4000),
            dateHeader
          );

          const isActionable = Boolean(extracted && extracted.is_actionable);
          let createdTaskId = null;

          if (isActionable) {
            const deadlineVal = extracted.deadline_iso || null;
            const urgency = computeUrgencyTier(deadlineVal);

            const insertResult = await run(`
              INSERT INTO deadline_tasks (
                title, category, action_required, deadline_iso, deadline_text_raw,
                deadline_exact, primary_link, sender, source_subject, raw_snippet,
                urgency_tier, status, priority_score, confidence, email_thread_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              extracted.title || subject,
              extracted.category || 'other',
              extracted.action_required || 'Review announcement',
              deadlineVal,
              extracted.deadline_text_raw || null,
              extracted.deadline_exact !== false ? 1 : 0,
              extracted.primary_link || null,
              sender,
              subject,
              bodyText.substring(0, 300),
              urgency,
              'active',
              extracted.priority_score || 3,
              extracted.confidence || 0.95,
              messageId
            ]);

            createdTaskId = insertResult.lastID;
          }

          // Insert log entry
          await run(`
            INSERT OR IGNORE INTO email_logs (
              message_id, sender, subject, is_actionable, extracted_task_id, raw_body
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            messageId,
            sender,
            subject,
            isActionable ? 1 : 0,
            createdTaskId,
            bodyText.substring(0, 500)
          ]);

          return {
            subject,
            sender,
            is_actionable: isActionable,
            extracted,
            createdTaskId
          };
        } catch (itemErr) {
          console.error(`Error processing email uid ${msg.uid}:`, itemErr.message);
          return null;
        }
      });

      const results = await Promise.all(processPromises);
      for (const res of results) {
        if (res) {
          processedEmails.push(res);
          if (res.is_actionable && res.createdTaskId) {
            actionableTasks.push({ id: res.createdTaskId, title: res.subject });
          }
        }
      }
    } finally {
      try { lock.release(); } catch (_) {}
    }

    try { await client.logout(); } catch (_) {}

    return {
      success: true,
      total_scanned: processedEmails.length,
      actionable_found: actionableTasks.length,
      processed_items: processedEmails,
      message: `Successfully scanned ${processedEmails.length} emails. Found ${actionableTasks.length} actionable deadlines!`
    };
  } catch (err) {
    try { await client.logout(); } catch (_) {}
    return {
      success: false,
      message: `Mailbox scan error: ${err.message}`
    };
  }
}

module.exports = {
  testImapConnection,
  fetchAndProcessRealEmails
};
