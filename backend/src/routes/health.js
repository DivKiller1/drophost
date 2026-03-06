const express = require('express');
const { healthCheck } = require('../services/db.service');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    await healthCheck();
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ status: 'error', message: 'database connection failed' });
  }
});

module.exports = router;

