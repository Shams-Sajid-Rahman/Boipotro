import bcrypt from 'bcrypt';
import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { findUserById } from './user.service.js';
import { localPathFor, removeFiles } from '../middleware/upload.js';

const TZ = 'Asia/Dhaka';
const escapeLike = (s) => `%${s.replace(/[\\%_]/g, '\\$&')}%`;
const uniqueViolation = (err, message) => {
  if (err.code === '23505') throw ApiError.conflict(message);
  throw err;
};

// ---------- Audit log ----------

export async function logAction(adminId, action, targetType, targetId = null, details = null) {
  await query(
    'INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
    [adminId, action, targetType, targetId, details],
  );
}

export async function listAudit({ page, limit }) {
  const { rows } = await query(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at,
            u.name AS admin_name, count(*) OVER () AS total
     FROM admin_audit_log a LEFT JOIN users u ON u.id = a.admin_id
     ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit],
  );
  return {
    data: rows.map((r) => ({
      id: r.id, action: r.action, targetType: r.target_type, targetId: r.target_id,
      details: r.details, createdAt: r.created_at, adminName: r.admin_name,
    })),
    total: rows[0]?.total ?? 0, page, limit,
  };
}

// ---------- Users ----------

export async function getUserDetail(id) {
  const user = await findUserById(id);
  if (!user) throw ApiError.notFound('User not found');
  const { rows: [s] } = await query(
    `SELECT u.is_banned,
       (SELECT count(*) FROM listings WHERE seller_id = $1 AND status = 'active')   AS active_listings,
       (SELECT count(*) FROM listings WHERE seller_id = $1 AND status = 'sold')     AS sold_listings,
       (SELECT COALESCE(sum(sold_price), 0) FROM listings WHERE seller_id = $1 AND status = 'sold') AS sales_value,
       (SELECT count(*) FROM listings WHERE buyer_id = $1)                          AS purchases,
       (SELECT count(*) FROM offers WHERE buyer_id = $1)                            AS offers_made,
       (SELECT count(*) FROM messages WHERE sender_id = $1)                         AS messages_sent,
       (SELECT round(avg(rating), 1) FROM reviews WHERE seller_id = $1)             AS rating_avg,
       (SELECT count(*) FROM reports r JOIN listings l ON l.id = r.listing_id WHERE l.seller_id = $1) AS reports_against
     FROM users u WHERE u.id = $1`,
    [id],
  );
  return {
    ...user,
    isBanned: s.is_banned,
    stats: {
      activeListings: s.active_listings, soldListings: s.sold_listings, salesValue: s.sales_value,
      purchases: s.purchases, offersMade: s.offers_made, messagesSent: s.messages_sent,
      ratingAvg: s.rating_avg, reportsAgainst: s.reports_against,
    },
  };
}

export async function createUser({ name, email, password, phone, universityId, department, role, isVerified }) {
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, phone, university_id, department, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, email, hash, phone ?? null, universityId ?? null, department ?? null, role, isVerified],
    );
    return getUserDetail(rows[0].id);
  } catch (err) {
    return uniqueViolation(err, 'An account with this email already exists');
  }
}

/** Only provided fields change. `null` clears optional fields (phone, department, university). */
const USER_COLUMNS = {
  name: 'name', email: 'email', phone: 'phone', universityId: 'university_id',
  department: 'department', role: 'role', isVerified: 'is_verified',
};

export async function updateUser(id, adminId, fields) {
  if (id === adminId && fields.role && fields.role !== 'admin') {
    throw ApiError.badRequest('You cannot remove your own admin role');
  }
  const values = [];
  const add = (v) => { values.push(v); return `$${values.length}`; };
  const sets = Object.entries(fields)
    .filter(([k, v]) => USER_COLUMNS[k] && v !== undefined)
    .map(([k, v]) => `${USER_COLUMNS[k]} = ${add(v)}`);
  if (fields.password) sets.push(`password_hash = ${add(await bcrypt.hash(fields.password, 12))}`);
  if (!sets.length) return getUserDetail(id);

  try {
    const { rowCount } = await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ${add(id)}`, values);
    if (!rowCount) throw ApiError.notFound('User not found');
  } catch (err) {
    uniqueViolation(err, 'Another account already uses this email');
  }
  // A password or role change signs the user out everywhere.
  if (fields.password || fields.role) {
    await query('UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE user_id = $1 AND revoked = false', [id]);
  }
  return getUserDetail(id);
}

/** Permanently deletes the account and (via cascades) their listings, offers, chats and wishlist. */
export async function deleteUser(id, adminId) {
  if (id === adminId) throw ApiError.badRequest('You cannot delete your own account here');
  const imagePaths = [];
  await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT role FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw ApiError.notFound('User not found');
    if (rows[0].role === 'admin') {
      const { rows: [c] } = await client.query("SELECT count(*) AS n FROM users WHERE role = 'admin'");
      if (c.n <= 1) throw ApiError.badRequest('Cannot delete the last admin');
    }
    const { rows: imgs } = await client.query(
      'SELECT li.url FROM listing_images li JOIN listings l ON l.id = li.listing_id WHERE l.seller_id = $1',
      [id],
    );
    imagePaths.push(...imgs.map((i) => localPathFor(i.url)));
    await client.query('DELETE FROM users WHERE id = $1', [id]);
  });
  await removeFiles(imagePaths);
}

// ---------- Listings ----------

export async function restoreListing(id) {
  const { rowCount } = await query("UPDATE listings SET status = 'active' WHERE id = $1 AND status = 'removed'", [id]);
  if (!rowCount) throw ApiError.notFound('Listing not found or not removed');
}

export async function hardDeleteListing(id) {
  const { rows } = await query('SELECT url FROM listing_images WHERE listing_id = $1', [id]);
  const { rowCount } = await query('DELETE FROM listings WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('Listing not found');
  await removeFiles(rows.map((r) => localPathFor(r.url)));
}

// ---------- Categories & universities ----------

export const slugify = (s) =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export async function createCategory({ name, slug }) {
  try {
    const { rows } = await query('INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug', [name, slug || slugify(name)]);
    return rows[0];
  } catch (err) {
    return uniqueViolation(err, 'A category with this name or slug already exists');
  }
}

export async function updateCategory(id, { name, slug }) {
  try {
    const { rows } = await query(
      'UPDATE categories SET name = COALESCE($2, name), slug = COALESCE($3, slug) WHERE id = $1 RETURNING id, name, slug',
      [id, name ?? null, slug ?? null],
    );
    if (!rows[0]) throw ApiError.notFound('Category not found');
    return rows[0];
  } catch (err) {
    return uniqueViolation(err, 'A category with this name or slug already exists');
  }
}

export async function deleteCategory(id) {
  try {
    const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [id]);
    if (!rowCount) throw ApiError.notFound('Category not found');
  } catch (err) {
    // 23001 = restrict_violation (ON DELETE RESTRICT), 23503 = foreign_key_violation.
    if (err.code === '23001' || err.code === '23503') throw ApiError.conflict('This category still has listings. Move or delete them first.');
    throw err;
  }
}

export async function createUniversity({ name, emailDomain, city }) {
  try {
    const { rows } = await query(
      'INSERT INTO universities (name, email_domain, city) VALUES ($1, $2, $3) RETURNING id',
      [name, emailDomain ?? null, city],
    );
    return rows[0];
  } catch (err) {
    return uniqueViolation(err, 'A university with this name or email domain already exists');
  }
}

export async function updateUniversity(id, { name, emailDomain, city }) {
  try {
    const { rowCount } = await query(
      `UPDATE universities SET name = COALESCE($2, name), email_domain = COALESCE($3, email_domain),
              city = COALESCE($4, city) WHERE id = $1`,
      [id, name ?? null, emailDomain ?? null, city ?? null],
    );
    if (!rowCount) throw ApiError.notFound('University not found');
  } catch (err) {
    uniqueViolation(err, 'A university with this name or email domain already exists');
  }
}

/** Users and listings keep existing; their university becomes empty (ON DELETE SET NULL). */
export async function deleteUniversity(id) {
  const { rowCount } = await query('DELETE FROM universities WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('University not found');
}

// ---------- Site content & settings ----------

export async function updateSiteContent(key, value) {
  const { rowCount } = await query(
    'UPDATE site_content SET value = $2, updated_at = now() WHERE key = $1',
    [key, JSON.stringify(value)],
  );
  if (!rowCount) throw ApiError.notFound(`Unknown content section "${key}"`);
}

// ---------- Sales analytics ----------

export async function getSalesReport({ days }) {
  const range = [days];
  const sinceSql = `sold_at >= (date_trunc('day', now() AT TIME ZONE '${TZ}') - make_interval(days => $1 - 1)) AT TIME ZONE '${TZ}'`;

  const [{ rows: [totals] }, { rows: [allTime] }, { rows: daily }, { rows: byCategory }, { rows: topSellers },
    { rows: recent }, { rows: [pipeline] }, { rows: [rate] }] = await Promise.all([
    query(`SELECT count(*) AS sold, COALESCE(sum(sold_price), 0) AS gmv,
                  COALESCE(sum(sold_commission), 0) AS earnings, COALESCE(round(avg(sold_price), 2), 0) AS avg_price
           FROM listings WHERE status = 'sold' AND ${sinceSql}`, range),
    query(`SELECT count(*) AS sold, COALESCE(sum(sold_price), 0) AS gmv, COALESCE(sum(sold_commission), 0) AS earnings
           FROM listings WHERE status = 'sold'`),
    query(`SELECT d::date AS day,
                  count(l.id) AS sold,
                  COALESCE(sum(l.sold_price), 0) AS gmv,
                  COALESCE(sum(l.sold_commission), 0) AS earnings
           FROM generate_series((now() AT TIME ZONE '${TZ}')::date - ($1 - 1), (now() AT TIME ZONE '${TZ}')::date, interval '1 day') d
           LEFT JOIN listings l ON l.status = 'sold' AND (l.sold_at AT TIME ZONE '${TZ}')::date = d::date
           GROUP BY d ORDER BY d`, range),
    query(`SELECT c.name, count(l.id) AS sold, COALESCE(sum(l.sold_price), 0) AS gmv,
                  COALESCE(sum(l.sold_commission), 0) AS earnings
           FROM listings l JOIN categories c ON c.id = l.category_id
           WHERE l.status = 'sold' AND ${sinceSql.replace('sold_at', 'l.sold_at')}
           GROUP BY c.name ORDER BY gmv DESC`, range),
    query(`SELECT u.id, u.name, count(l.id) AS sold, sum(l.sold_price) AS gmv
           FROM listings l JOIN users u ON u.id = l.seller_id
           WHERE l.status = 'sold' AND ${sinceSql.replace('sold_at', 'l.sold_at')}
           GROUP BY u.id ORDER BY gmv DESC LIMIT 5`, range),
    query(`SELECT l.id, l.title, l.sold_price, l.sold_commission, l.sold_at, l.price,
                  s.name AS seller_name, b.name AS buyer_name
           FROM listings l JOIN users s ON s.id = l.seller_id LEFT JOIN users b ON b.id = l.buyer_id
           WHERE l.status = 'sold' ORDER BY l.sold_at DESC NULLS LAST LIMIT 20`),
    query(`SELECT
             count(*) FILTER (WHERE status = 'active')   AS active,
             count(*) FILTER (WHERE status = 'reserved') AS reserved,
             count(*) FILTER (WHERE status = 'sold')     AS sold,
             count(*) FILTER (WHERE status = 'removed')  AS removed,
             (SELECT count(*) FROM offers WHERE status = 'pending')  AS offers_pending,
             (SELECT count(*) FROM offers WHERE status = 'accepted') AS offers_accepted,
             (SELECT count(*) FROM offers WHERE status = 'rejected') AS offers_rejected
           FROM listings`),
    query("SELECT COALESCE((value->>'commissionPercent')::numeric, 0) AS pct FROM site_content WHERE key = 'fees'"),
  ]);

  return {
    days,
    commissionPercent: rate?.pct ?? 0,
    totals: { sold: totals.sold, gmv: totals.gmv, earnings: totals.earnings, avgPrice: totals.avg_price },
    allTime: { sold: allTime.sold, gmv: allTime.gmv, earnings: allTime.earnings },
    daily: daily.map((d) => ({ day: d.day, sold: d.sold, gmv: d.gmv, earnings: d.earnings })),
    byCategory: byCategory.map((c) => ({ name: c.name, sold: c.sold, gmv: c.gmv, earnings: c.earnings })),
    topSellers: topSellers.map((s) => ({ id: s.id, name: s.name, sold: s.sold, gmv: s.gmv })),
    recent: recent.map((r) => ({
      id: r.id, title: r.title, soldPrice: r.sold_price, askingPrice: r.price, commission: r.sold_commission,
      soldAt: r.sold_at, seller: r.seller_name, buyer: r.buyer_name,
    })),
    pipeline: {
      active: pipeline.active, reserved: pipeline.reserved, sold: pipeline.sold, removed: pipeline.removed,
      offersPending: pipeline.offers_pending, offersAccepted: pipeline.offers_accepted, offersRejected: pipeline.offers_rejected,
    },
  };
}

// ---------- Chat activity ----------

export async function getChatStats({ days }) {
  const [{ rows: [s] }, { rows: daily }] = await Promise.all([
    query(`SELECT
             (SELECT count(*) FROM conversations) AS conversations,
             (SELECT count(*) FROM messages) AS messages,
             (SELECT count(*) FROM messages WHERE created_at > now() - interval '24 hours') AS messages_24h,
             (SELECT count(DISTINCT conversation_id) FROM messages WHERE created_at > now() - interval '7 days') AS active_7d,
             (SELECT count(*) FROM messages WHERE read_at IS NULL) AS unread`),
    query(`SELECT d::date AS day, count(m.id) AS messages
           FROM generate_series((now() AT TIME ZONE '${TZ}')::date - ($1 - 1), (now() AT TIME ZONE '${TZ}')::date, interval '1 day') d
           LEFT JOIN messages m ON (m.created_at AT TIME ZONE '${TZ}')::date = d::date
           GROUP BY d ORDER BY d`, [days]),
  ]);
  return {
    conversations: s.conversations, messages: s.messages, messages24h: s.messages_24h,
    activeConversations7d: s.active_7d, unread: s.unread,
    daily: daily.map((d) => ({ day: d.day, messages: d.messages })),
  };
}

export async function listConversations({ q, page, limit }) {
  const { rows } = await query(
    `SELECT cv.id, cv.created_at, cv.last_message_at,
            l.id AS listing_id, l.title AS listing_title,
            b.id AS buyer_id, b.name AS buyer_name, s.id AS seller_id, s.name AS seller_name,
            (SELECT count(*) FROM messages m WHERE m.conversation_id = cv.id) AS message_count,
            count(*) OVER () AS total
     FROM conversations cv
     JOIN listings l ON l.id = cv.listing_id
     JOIN users b ON b.id = cv.buyer_id
     JOIN users s ON s.id = cv.seller_id
     WHERE ($1::text IS NULL OR l.title ILIKE $1 OR b.name ILIKE $1 OR s.name ILIKE $1)
     ORDER BY cv.last_message_at DESC
     LIMIT $2 OFFSET $3`,
    [q ? escapeLike(q) : null, limit, (page - 1) * limit],
  );
  return {
    data: rows.map((r) => ({
      id: r.id, createdAt: r.created_at, lastMessageAt: r.last_message_at, messageCount: r.message_count,
      listing: { id: r.listing_id, title: r.listing_title },
      buyer: { id: r.buyer_id, name: r.buyer_name }, seller: { id: r.seller_id, name: r.seller_name },
    })),
    total: rows[0]?.total ?? 0, page, limit,
  };
}

/** Read-only transcript for moderation. The caller logs the access to the audit log. */
export async function getConversationTranscript(id) {
  const { rows: [conv] } = await query(
    `SELECT cv.id, l.id AS listing_id, l.title, b.id AS buyer_id, b.name AS buyer_name, s.id AS seller_id, s.name AS seller_name
     FROM conversations cv JOIN listings l ON l.id = cv.listing_id
     JOIN users b ON b.id = cv.buyer_id JOIN users s ON s.id = cv.seller_id
     WHERE cv.id = $1`,
    [id],
  );
  if (!conv) throw ApiError.notFound('Conversation not found');
  const { rows } = await query(
    `SELECT id, sender_id, body, read_at, created_at FROM messages
     WHERE conversation_id = $1 ORDER BY created_at ASC, id ASC LIMIT 500`,
    [id],
  );
  return {
    id: conv.id,
    listing: { id: conv.listing_id, title: conv.title },
    buyer: { id: conv.buyer_id, name: conv.buyer_name },
    seller: { id: conv.seller_id, name: conv.seller_name },
    messages: rows.map((m) => ({ id: m.id, senderId: m.sender_id, body: m.body, readAt: m.read_at, createdAt: m.created_at })),
  };
}
