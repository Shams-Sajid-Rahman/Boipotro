-- Full-text search over title (weight A) and author (weight B).
-- 'simple' config = no English stemming, works for transliterated Bangla names too.
ALTER TABLE listings
  ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(author, '')), 'B')
  ) STORED;

CREATE INDEX idx_listings_search_vector ON listings USING GIN (search_vector);

-- Only bump updated_at when real content changes, not when view_count increments.
DROP TRIGGER trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE OF seller_id, title, author, isbn, edition, category_id, university_id,
                   condition, price, description, status
  ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- When a refresh token was rotated/revoked. Lets us tell a harmless race
-- (two tabs refreshing at once) from replay of an old, stolen token.
ALTER TABLE refresh_tokens ADD COLUMN revoked_at TIMESTAMPTZ;
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);
