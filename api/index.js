// Vercel Serverless Function Entrypoint
const app = require('../backend/server');
const { initDb } = require('../backend/db');

let isDbInitialized = false;

module.exports = async (req, res) => {
  // Ensure tables and seed data are initialized on cold start
  if (!isDbInitialized) {
    try {
      await initDb();
      isDbInitialized = true;
    } catch (err) {
      console.error('Serverless DB init warning:', err.message);
    }
  }

  // Forward request directly to Express
  return app(req, res);
};
