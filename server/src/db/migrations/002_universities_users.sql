CREATE TABLE universities (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  -- Student email domain, e.g. 'northsouth.edu'. Used later for verification.
  email_domain CITEXT UNIQUE,
  city         TEXT NOT NULL
);

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  email         CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  -- Bangladeshi mobile, stored as +8801XXXXXXXXX.
  phone         TEXT CHECK (phone ~ '^\+8801[3-9][0-9]{8}$'),
  -- Keep the account if a university row is removed.
  university_id BIGINT REFERENCES universities (id) ON DELETE SET NULL,
  department    TEXT,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_university ON users (university_id);

CREATE TABLE refresh_tokens (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- SHA-256 of the raw token; the raw token is never stored.
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
