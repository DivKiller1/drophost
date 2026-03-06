-- DropHost database schema
-- Enables gen_random_uuid() for UUID primary keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS deployments (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100)  NOT NULL,
  slot          VARCHAR(50)   UNIQUE NOT NULL,         -- URL slug: /d/{slot}/
  file_path     TEXT          NOT NULL,                -- absolute path on site_files volume
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending|building|live|failed|expired
  lan_url       TEXT,                                  -- full URL once live
  ttl_seconds   INTEGER,                               -- NULL = permanent
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config_versions (
  id               SERIAL       PRIMARY KEY,
  deployment_id    UUID         NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  version_number   INTEGER      NOT NULL,
  nginx_config     TEXT         NOT NULL,   -- full server block text
  diff_summary     TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (deployment_id, version_number)
);

CREATE TABLE IF NOT EXISTS access_logs (
  id              BIGSERIAL    PRIMARY KEY,
  deployment_id   UUID         NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  client_ip       INET         NOT NULL,
  user_agent      TEXT,
  status_code     INTEGER      NOT NULL,
  accessed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

