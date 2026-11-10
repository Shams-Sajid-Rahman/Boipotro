-- Admin moderation: banning users and resolving reports.
ALTER TABLE users ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE reports
  ADD COLUMN details     TEXT CHECK (char_length(details) <= 1000),
  ADD COLUMN resolved_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN resolved_at TIMESTAMPTZ,
  ADD COLUMN admin_note  TEXT CHECK (char_length(admin_note) <= 500);

-- reason becomes a short category; free text lives in details.
ALTER TABLE reports DROP CONSTRAINT reports_reason_check;
ALTER TABLE reports ADD CONSTRAINT reports_reason_check
  CHECK (reason IN ('spam', 'fake_or_misleading', 'prohibited_item', 'wrong_price', 'harassment', 'other'));

-- One open report per user per listing.
CREATE UNIQUE INDEX uq_reports_open_per_reporter
  ON reports (listing_id, reporter_id) WHERE status IN ('open', 'reviewing');
