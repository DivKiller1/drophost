const express = require('express');
const healthRouter = require('./routes/health');
const deploymentsRouter = require('./routes/deployments');

const { getEnv } = require('./config/env');

const { port } = getEnv();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes mounted at root; nginx will prefix /api/
app.use(healthRouter);
app.use(deploymentsRouter);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message || err);
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || 'internal server error' });
});

app.listen(port, () => {
  console.log(`DropHost backend listening on port ${port}`);
});


