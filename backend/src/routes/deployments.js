const express = require('express');
const multer = require('multer');
const {
  createDeployment,
  listDeployments,
  getDeploymentById,
  deleteDeployment,
  redeploy
} = require('../services/deploy.service');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/deployments', upload.single('file'), async (req, res, next) => {
  try {
    const { name, ttl_seconds } = req.body;
    const file = req.file;

    if (!name) {
      const error = new Error('name is required');
      error.statusCode = 400;
      throw error;
    }

    const deployment = await createDeployment(file, name, ttl_seconds);
    res.status(201).json(deployment);
  } catch (err) {
    next(err);
  }
});

router.get('/deployments', async (req, res, next) => {
  try {
    const deployments = await listDeployments();
    res.json(deployments);
  } catch (err) {
    next(err);
  }
});

router.get('/deployments/:id', async (req, res, next) => {
  try {
    const deployment = await getDeploymentById(req.params.id);
    res.json(deployment);
  } catch (err) {
    next(err);
  }
});

router.get('/deployments/:id/status', async (req, res, next) => {
  try {
    const deployment = await getDeploymentById(req.params.id);
    res.json({ id: deployment.id, status: deployment.status });
  } catch (err) {
    next(err);
  }
});

router.delete('/deployments/:id', async (req, res, next) => {
  try {
    await deleteDeployment(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/deployments/:id/redeploy', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      const error = new Error('file is required');
      error.statusCode = 400;
      throw error;
    }
    await redeploy(req.params.id, file);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;

