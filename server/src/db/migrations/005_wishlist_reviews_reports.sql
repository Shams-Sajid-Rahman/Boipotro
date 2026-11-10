CREATE TABLE wishlist (
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  listing_id BIGINT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX idx_wishlist_listing ON wishlist (listing_id);

CREATE TABLE reviews (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reviewer_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seller_id   BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Keep the review (and the seller's rating) even if the listing is deleted.
  listing_id  BIGINT REFERENCES listings (id) ON DELETE SET NULL,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT CHECK (char_length(comment) <= 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_reviews_not_self CHECK (reviewer_id <> seller_id),
  -- One review per buyer per listing.
  CONSTRAINT uq_reviews_reviewer_listing UNIQUE (reviewer_id, listing_id)
);

CREATE INDEX idx_reviews_seller ON reviews (seller_id);

CREATE TABLE reports (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Keep the report for moderators even if the reporter deletes their account.
  reporter_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  listing_id  BIGINT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  reason      TEXT NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 1000),
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status  ON reports (status, created_at DESC);
CREATE INDEX idx_reports_listing ON reports (listing_id);
