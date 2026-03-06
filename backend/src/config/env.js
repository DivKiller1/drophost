const REQUIRED_ENV = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASS',
  'PORT',
  'NGINX_CONFD_PATH',
  'SITE_FILES_PATH',
  'NGINX_CONTAINER_NAME',
  'NGINX_LAN_IP'
];

function getEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const error = new Error(`Missing required environment variables: ${missing.join(', ')}`);
    error.statusCode = 503;
    throw error;
  }

  return {
    port: Number(process.env.PORT),
    db: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASS
    },
    nginx: {
      confdPath: process.env.NGINX_CONFD_PATH,
      siteFilesPath: process.env.SITE_FILES_PATH,
      containerName: process.env.NGINX_CONTAINER_NAME,
      lanIp: process.env.NGINX_LAN_IP
    }
  };
}

module.exports = {
  getEnv
};

