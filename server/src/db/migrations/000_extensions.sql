-- Phase 0: base extensions used by later migrations.
-- pg_trgm powers fast fuzzy search on title / author.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- citext gives case-insensitive emails.
CREATE EXTENSION IF NOT EXISTS citext;
