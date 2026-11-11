-- Sale record on the listing: final price and the platform commission at that moment
-- (stored, so changing the commission rate later doesn't rewrite past earnings).
ALTER TABLE listings
  ADD COLUMN sold_price      NUMERIC(10, 2) CHECK (sold_price > 0),
  ADD COLUMN sold_commission NUMERIC(10, 2) CHECK (sold_commission >= 0),
  ADD COLUMN sold_at         TIMESTAMPTZ;

CREATE INDEX idx_listings_sold_at ON listings (sold_at) WHERE status = 'sold';

-- Platform settings (admin-editable). Public: sellers can see the fee.
INSERT INTO site_content (key, value) VALUES ('fees', '{"commissionPercent": 5}')
ON CONFLICT (key) DO NOTHING;

-- Backfill existing sold listings: accepted offer amount, else listing price.
UPDATE listings l
SET sold_price = COALESCE(
      (SELECT o.amount FROM offers o WHERE o.listing_id = l.id AND o.status = 'accepted'
       ORDER BY o.created_at DESC LIMIT 1),
      l.price),
    sold_at = l.updated_at
WHERE l.status = 'sold';
UPDATE listings SET sold_commission = round(sold_price * 0.05, 2) WHERE status = 'sold';

-- Every admin action (including opening a private chat) is recorded.
CREATE TABLE admin_audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id    BIGINT REFERENCES users (id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   BIGINT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_created ON admin_audit_log (created_at DESC);
