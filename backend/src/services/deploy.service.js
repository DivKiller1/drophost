const { query } = require('./db.service');
const { storeUploadedFile } = require('./file.service');
const { writeConfig, reloadNginx, buildLanUrl, removeConfigAndFiles } = require('./nginx.service');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function generateUniqueSlug(baseName) {
  let slug = slugify(baseName);
  if (!slug) {
    slug = 'site';
  }

  let counter = 1;
  // Check for collisions and append -2, -3, ...
  // Note: UNIQUE constraint on slot will enforce this as well, but we avoid errors by checking first.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await query('SELECT 1 FROM deployments WHERE slot = $1', [slug]);
    if (rows.length === 0) {
      return slug;
    }
    counter += 1;
    slug = `${slugify(baseName)}-${counter}`;
  }
}

async function createDeployment(file, name, ttlSeconds) {
  const slug = await generateUniqueSlug(name);

  const ttl = ttlSeconds ? Number(ttlSeconds) : null;
  const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;

  const filePath = await storeUploadedFile(file, slug);

  const insertResult = await query(
    `INSERT INTO deployments (name, slot, file_path, status, ttl_seconds, expires_at)
     VALUES ($1, $2, $3, 'building', $4, $5)
     RETURNING id, created_at`,
    [name, slug, filePath, ttl, expiresAt]
  );

  const deployment = insertResult.rows[0];

  const { configText } = await writeConfig(slug);

  await query(
    `INSERT INTO config_versions (deployment_id, version_number, nginx_config)
     VALUES ($1, 1, $2)`,
    [deployment.id, configText]
  );

  await reloadNginx();

  const lanUrl = buildLanUrl(slug);

  await query(
    `UPDATE deployments
     SET status = 'live', lan_url = $1, updated_at = NOW()
     WHERE id = $2`,
    [lanUrl, deployment.id]
  );

  return {
    id: deployment.id,
    name,
    slot: slug,
    status: 'live',
    lan_url: lanUrl,
    created_at: deployment.created_at
  };
}

async function listDeployments() {
  const { rows } = await query(
    `SELECT id, name, slot, status, lan_url, ttl_seconds, expires_at, created_at, updated_at
     FROM deployments
     ORDER BY created_at DESC`
  );
  return rows;
}

async function getDeploymentById(id) {
  const { rows } = await query(
    `SELECT id, name, slot, status, lan_url, ttl_seconds, expires_at, created_at, updated_at
     FROM deployments
     WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) {
    const error = new Error('deployment not found');
    error.statusCode = 404;
    throw error;
  }

  const deployment = rows[0];
  if (deployment.expires_at && new Date(deployment.expires_at) < new Date()) {
    const error = new Error('deployment has expired');
    error.statusCode = 410;
    throw error;
  }

  return deployment;
}

async function deleteDeployment(id) {
  const dep = await getDeploymentById(id);

  await removeConfigAndFiles(dep.slot);
  await reloadNginx();

  await query(
    `UPDATE deployments
     SET status = 'expired', updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

async function redeploy(id, file) {
  const dep = await getDeploymentById(id);

  await storeUploadedFile(file, dep.slot);

  const { configText } = await writeConfig(dep.slot);

  const { rows } = await query(
    `SELECT COALESCE(MAX(version_number), 0) AS max_version
     FROM config_versions
     WHERE deployment_id = $1`,
    [id]
  );

  const nextVersion = Number(rows[0].max_version) + 1;

  await query(
    `INSERT INTO config_versions (deployment_id, version_number, nginx_config)
     VALUES ($1, $2, $3)`,
    [id, nextVersion, configText]
  );

  await reloadNginx();

  await query(
    `UPDATE deployments
     SET updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

module.exports = {
  createDeployment,
  listDeployments,
  getDeploymentById,
  deleteDeployment,
  redeploy
};

