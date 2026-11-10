CREATE TABLE categories (
  id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE listings (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Deleting a user deletes their listings (and, via cascades, images/offers/chats).
  seller_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  author        TEXT NOT NULL CHECK (char_length(author) BETWEEN 2 AND 200),
  -- Normalised ISBN-10 or ISBN-13 with no hyphens/spaces.
  isbn          TEXT CHECK (isbn ~ '^([0-9]{9}[0-9X]|[0-9]{13})$'),
  edition       TEXT,
  -- A category in use cannot be deleted.
  category_id   BIGINT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  university_id BIGINT REFERENCES universities (id) ON DELETE SET NULL,
  condition     TEXT NOT NULL CHECK (condition IN ('new', 'near_new', 'used', 'heavily_used')),
  price         NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'reserved', 'sold', 'removed')),
  view_count    INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Search: trigram indexes make ILIKE '%term%' and similarity() fast on title/author.
CREATE INDEX idx_listings_title_trgm  ON listings USING GIN (title gin_trgm_ops);
CREATE INDEX idx_listings_author_trgm ON listings USING GIN (author gin_trgm_ops);
CREATE INDEX idx_listings_isbn        ON listings (isbn);

-- Filters and sorting.
CREATE INDEX idx_listings_status_created ON listings (status, created_at DESC);
CREATE INDEX idx_listings_category       ON listings (category_id);
CREATE INDEX idx_listings_price          ON listings (price);
CREATE INDEX idx_listings_university     ON listings (university_id);
CREATE INDEX idx_listings_seller         ON listings (seller_id);

CREATE TABLE listing_images (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  -- 0 = cover image.
  position   SMALLINT NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (listing_id, position)
);
