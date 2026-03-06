const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const { getEnv } = require('../config/env');

const {
  nginx: { siteFilesPath }
} = getEnv();

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function saveHtmlFile(buffer, slug) {
  const targetDir = path.join(siteFilesPath, slug);
  await ensureDir(targetDir);
  const indexPath = path.join(targetDir, 'index.html');
  await fs.promises.writeFile(indexPath, buffer);
  return targetDir;
}

async function extractZip(buffer, slug) {
  const targetDir = path.join(siteFilesPath, slug);
  await ensureDir(targetDir);

  const zipStream = unzipper.Open.buffer(buffer);
  const directory = await zipStream;

  let hasIndex = false;

  for (const entry of directory.files) {
    const entryPath = entry.path.replace(/\\/g, '/');
    const destPath = path.join(targetDir, entryPath);

    if (entry.type === 'Directory') {
      await ensureDir(destPath);
      continue;
    }

    await ensureDir(path.dirname(destPath));
    const writeStream = fs.createWriteStream(destPath);
    await new Promise((resolve, reject) => {
      entry.stream().pipe(writeStream).on('finish', resolve).on('error', reject);
    });

    if (entryPath.toLowerCase() === 'index.html') {
      hasIndex = true;
    }
  }

  if (!hasIndex) {
    const error = new Error('zip must contain an index.html at root level');
    error.statusCode = 422;
    throw error;
  }

  return targetDir;
}

async function storeUploadedFile(file, slug) {
  if (!file) {
    const error = new Error('file is required');
    error.statusCode = 400;
    throw error;
  }

  const buffer = file.buffer;

  if (!file.originalname) {
    const error = new Error('file is required');
    error.statusCode = 400;
    throw error;
  }

  const lowerName = file.originalname.toLowerCase();
  if (lowerName.endsWith('.html')) {
    return saveHtmlFile(buffer, slug);
  }

  if (lowerName.endsWith('.zip')) {
    return extractZip(buffer, slug);
  }

  const error = new Error('only .html and .zip files accepted');
  error.statusCode = 422;
  throw error;
}

module.exports = {
  storeUploadedFile
};

