/**
 * ============================================================================
 * Vercel Serverless Function Entrypoint
 * ============================================================================
 * Handles all serverless HTTP requests routed through /api/(.*).
 * Initializes the SQLite database on cold start and forwards requests to Express.
 * ============================================================================
 */

const app = require('../backend/server');
const { initDb } = require('../backend/db');

let isDbInitialized = false;

module.exports = async (req, res) => {
  // Ensure tables and seed directives are initialized on serverless cold start
  if (!isDbInitialized) {
    try {
      await initDb();
      isDbInitialized = true;
    } catch (err) {
      console.error('Serverless DB cold start init warning:', err.message);
    }
  }

  // Forward request directly to Express application
  return app(req, res);
};
