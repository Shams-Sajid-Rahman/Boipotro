CREATE TABLE offers (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  buyer_id   BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount     NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  message    TEXT CHECK (char_length(message) <= 500),
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_listing ON offers (listing_id);
CREATE INDEX idx_offers_buyer   ON offers (buyer_id);
-- A buyer can have at most one pending offer per listing.
CREATE UNIQUE INDEX uq_offers_one_pending
  ON offers (listing_id, buyer_id) WHERE status = 'pending';

CREATE TABLE conversations (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id      BIGINT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  buyer_id        BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seller_id       BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Sorts the inbox; bumped whenever a message is inserted (trigger below).
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_conversations_listing_buyer UNIQUE (listing_id, buyer_id),
  CONSTRAINT chk_conversations_not_self CHECK (buyer_id <> seller_id)
);

CREATE INDEX idx_conversations_buyer  ON conversations (buyer_id, last_message_at DESC);
CREATE INDEX idx_conversations_seller ON conversations (seller_id, last_message_at DESC);

CREATE TABLE messages (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id       BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);
-- Fast unread counts.
CREATE INDEX idx_messages_unread ON messages (conversation_id) WHERE read_at IS NULL;

CREATE OR REPLACE FUNCTION bump_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_bump_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION bump_conversation_last_message();
