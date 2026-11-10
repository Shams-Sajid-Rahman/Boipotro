import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

const CONVERSATION_SELECT = `
  SELECT cv.id, cv.created_at, cv.last_message_at, cv.buyer_id, cv.seller_id,
         l.id AS listing_id, l.title AS listing_title, l.price AS listing_price, l.status AS listing_status,
         (SELECT li.url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position LIMIT 1) AS cover_url,
         other.id AS other_id, other.name AS other_name, other.avatar_url AS other_avatar,
         other.is_verified AS other_verified,
         lm.body AS last_body, lm.sender_id AS last_sender_id, lm.created_at AS last_created_at,
         (SELECT count(*) FROM messages m
          WHERE m.conversation_id = cv.id AND m.read_at IS NULL AND m.sender_id <> $1) AS unread_count
  FROM conversations cv
  JOIN listings l ON l.id = cv.listing_id
  JOIN users other ON other.id = CASE WHEN cv.buyer_id = $1 THEN cv.seller_id ELSE cv.buyer_id END
  LEFT JOIN LATERAL (
    SELECT body, sender_id, created_at FROM messages
    WHERE conversation_id = cv.id ORDER BY created_at DESC, id DESC LIMIT 1
  ) lm ON true`;

const toConversationDto = (r, userId) => ({
  id: r.id,
  createdAt: r.created_at,
  lastMessageAt: r.last_message_at,
  role: r.buyer_id === userId ? 'buyer' : 'seller',
  listing: { id: r.listing_id, title: r.listing_title, price: r.listing_price, status: r.listing_status, coverUrl: r.cover_url },
  otherUser: { id: r.other_id, name: r.other_name, avatarUrl: r.other_avatar, isVerified: r.other_verified },
  lastMessage: r.last_body ? { body: r.last_body, senderId: r.last_sender_id, createdAt: r.last_created_at } : null,
  unreadCount: r.unread_count,
});

const toMessageDto = (r) => ({
  id: r.id,
  conversationId: r.conversation_id,
  senderId: r.sender_id,
  body: r.body,
  readAt: r.read_at,
  createdAt: r.created_at,
});

/** Throws 404 (not 403, to avoid leaking existence) unless userId is a participant. */
export async function assertParticipant(conversationId, userId) {
  const { rows } = await query('SELECT id, buyer_id, seller_id FROM conversations WHERE id = $1', [conversationId]);
  const conv = rows[0];
  if (!conv || (conv.buyer_id !== userId && conv.seller_id !== userId)) {
    throw ApiError.notFound('Conversation not found');
  }
  return conv;
}

export async function getConversation(conversationId, userId) {
  await assertParticipant(conversationId, userId);
  const { rows } = await query(`${CONVERSATION_SELECT} WHERE cv.id = $2`, [userId, conversationId]);
  return toConversationDto(rows[0], userId);
}

/** Starts (or returns the existing) chat between the buyer and the listing's seller. */
export async function startConversation(listingId, buyerId) {
  const { rows } = await query('SELECT seller_id, status FROM listings WHERE id = $1', [listingId]);
  const listing = rows[0];
  if (!listing || listing.status === 'removed') throw ApiError.notFound('Listing not found');
  if (listing.seller_id === buyerId) throw ApiError.badRequest('You cannot message yourself about your own listing');

  const { rows: [conv] } = await query(
    `INSERT INTO conversations (listing_id, buyer_id, seller_id) VALUES ($1, $2, $3)
     ON CONFLICT (listing_id, buyer_id) DO UPDATE SET listing_id = EXCLUDED.listing_id
     RETURNING id`,
    [listingId, buyerId, listing.seller_id],
  );
  return getConversation(conv.id, buyerId);
}

export async function listConversations(userId) {
  const { rows } = await query(
    `${CONVERSATION_SELECT} WHERE cv.buyer_id = $1 OR cv.seller_id = $1 ORDER BY cv.last_message_at DESC`,
    [userId],
  );
  return rows.map((r) => toConversationDto(r, userId));
}

export async function getUnreadTotal(userId) {
  const { rows } = await query(
    `SELECT count(*) AS unread FROM messages m
     JOIN conversations cv ON cv.id = m.conversation_id
     WHERE (cv.buyer_id = $1 OR cv.seller_id = $1) AND m.sender_id <> $1 AND m.read_at IS NULL`,
    [userId],
  );
  return rows[0].unread;
}

/** Newest-first page; pass `before` (a message id) to load older messages. Returned oldest-first. */
export async function listMessages(conversationId, userId, { before, limit }) {
  await assertParticipant(conversationId, userId);
  const { rows } = await query(
    `SELECT id, conversation_id, sender_id, body, read_at, created_at FROM messages
     WHERE conversation_id = $1 AND ($2::bigint IS NULL OR id < $2)
     ORDER BY id DESC LIMIT $3`,
    [conversationId, before ?? null, limit + 1],
  );
  const hasMore = rows.length > limit;
  return { data: rows.slice(0, limit).reverse().map(toMessageDto), hasMore };
}

export async function sendMessage(conversationId, senderId, body) {
  const conv = await assertParticipant(conversationId, senderId);
  const { rows } = await query(
    `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)
     RETURNING id, conversation_id, sender_id, body, read_at, created_at`,
    [conversationId, senderId, body],
  );
  return { message: toMessageDto(rows[0]), participants: [conv.buyer_id, conv.seller_id] };
}

/** Marks the other person's messages as read; returns participants for notifying. */
export async function markRead(conversationId, userId) {
  const conv = await assertParticipant(conversationId, userId);
  const { rowCount } = await query(
    `UPDATE messages SET read_at = now()
     WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
    [conversationId, userId],
  );
  return { updated: rowCount, participants: [conv.buyer_id, conv.seller_id] };
}
