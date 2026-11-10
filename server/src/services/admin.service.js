import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

export async function getStats() {
  const { rows: [r] } = await query(`
    SELECT
      (SELECT count(*) FROM users)                                  AS users,
      (SELECT count(*) FROM users WHERE is_banned)                  AS banned_users,
      (SELECT count(*) FROM listings WHERE status = 'active')       AS active_listings,
      (SELECT count(*) FROM listings WHERE status = 'sold')         AS sold_listings,
      (SELECT count(*) FROM reports WHERE status IN ('open', 'reviewing')) AS open_reports
  `);
  return {
    users: r.users, bannedUsers: r.banned_users, activeListings: r.active_listings,
    soldListings: r.sold_listings, openReports: r.open_reports,
  };
}

const pageOf = (page, limit) => [limit, (page - 1) * limit];

export async function listUsers({ q, page, limit }) {
  const like = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null;
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.is_verified, u.is_banned, u.created_at,
            un.name AS university_name,
            (SELECT count(*) FROM listings l WHERE l.seller_id = u.id AND l.status <> 'removed') AS listings,
            count(*) OVER () AS total
     FROM users u LEFT JOIN universities un ON un.id = u.university_id
     WHERE ($1::text IS NULL OR u.name ILIKE $1 OR u.email::text ILIKE $1)
     ORDER BY u.created_at DESC
     LIMIT $2 OFFSET $3`,
    [like, ...pageOf(page, limit)],
  );
  return {
    data: rows.map((r) => ({
      id: r.id, name: r.name, email: r.email, role: r.role, isVerified: r.is_verified,
      isBanned: r.is_banned, createdAt: r.created_at, university: r.university_name, listings: r.listings,
    })),
    total: rows[0]?.total ?? 0, page, limit,
  };
}

export async function listListings({ q, status, page, limit }) {
  const like = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null;
  const { rows } = await query(
    `SELECT l.id, l.title, l.author, l.price, l.status, l.created_at, l.view_count,
            u.id AS seller_id, u.name AS seller_name,
            (SELECT count(*) FROM reports r WHERE r.listing_id = l.id AND r.status IN ('open', 'reviewing')) AS open_reports,
            count(*) OVER () AS total
     FROM listings l JOIN users u ON u.id = l.seller_id
     WHERE ($1::text IS NULL OR l.title ILIKE $1 OR l.author ILIKE $1)
       AND ($2::text IS NULL OR l.status = $2)
     ORDER BY l.created_at DESC
     LIMIT $3 OFFSET $4`,
    [like, status ?? null, ...pageOf(page, limit)],
  );
  return {
    data: rows.map((r) => ({
      id: r.id, title: r.title, author: r.author, price: r.price, status: r.status,
      createdAt: r.created_at, viewCount: r.view_count, openReports: r.open_reports,
      seller: { id: r.seller_id, name: r.seller_name },
    })),
    total: rows[0]?.total ?? 0, page, limit,
  };
}

export async function listReports({ status, page, limit }) {
  const { rows } = await query(
    `SELECT r.id, r.reason, r.details, r.status, r.created_at, r.resolved_at, r.admin_note,
            l.id AS listing_id, l.title AS listing_title, l.status AS listing_status,
            s.id AS seller_id, s.name AS seller_name, s.is_banned AS seller_banned,
            rp.id AS reporter_id, rp.name AS reporter_name,
            count(*) OVER () AS total
     FROM reports r
     JOIN listings l ON l.id = r.listing_id
     JOIN users s ON s.id = l.seller_id
     LEFT JOIN users rp ON rp.id = r.reporter_id
     WHERE ($1::text IS NULL OR r.status = $1)
     ORDER BY (r.status IN ('open', 'reviewing')) DESC, r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [status ?? null, ...pageOf(page, limit)],
  );
  return {
    data: rows.map((r) => ({
      id: r.id, reason: r.reason, details: r.details, status: r.status, createdAt: r.created_at,
      resolvedAt: r.resolved_at, adminNote: r.admin_note,
      listing: { id: r.listing_id, title: r.listing_title, status: r.listing_status },
      seller: { id: r.seller_id, name: r.seller_name, isBanned: r.seller_banned },
      reporter: r.reporter_id ? { id: r.reporter_id, name: r.reporter_name } : null,
    })),
    total: rows[0]?.total ?? 0, page, limit,
  };
}

export async function removeListing(listingId) {
  const { rowCount } = await query(
    "UPDATE listings SET status = 'removed' WHERE id = $1 AND status <> 'removed'",
    [listingId],
  );
  if (!rowCount) throw ApiError.notFound('Listing not found or already removed');
  await query("UPDATE offers SET status = 'cancelled' WHERE listing_id = $1 AND status = 'pending'", [listingId]);
}

/** Ban: block login, sign out everywhere and hide their active listings. Unban reverses the flag only. */
export async function setUserBanned(targetId, adminId, banned) {
  if (targetId === adminId) throw ApiError.badRequest('You cannot ban yourself');
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      'UPDATE users SET is_banned = $2 WHERE id = $1 RETURNING role',
      [targetId, banned],
    );
    if (!rows[0]) throw ApiError.notFound('User not found');
    if (rows[0].role === 'admin') throw ApiError.badRequest('Admins cannot be banned');
    if (banned) {
      await client.query(
        'UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE user_id = $1 AND revoked = false',
        [targetId],
      );
      await client.query(
        "UPDATE listings SET status = 'removed' WHERE seller_id = $1 AND status IN ('active', 'reserved')",
        [targetId],
      );
    }
  });
}

export async function updateReport(reportId, adminId, { status, adminNote }) {
  const closing = status === 'resolved' || status === 'dismissed';
  const { rowCount } = await query(
    `UPDATE reports
     SET status = $2, admin_note = COALESCE($3, admin_note),
         resolved_by = CASE WHEN $4 THEN $5::bigint ELSE NULL END,
         resolved_at = CASE WHEN $4 THEN now() ELSE NULL END
     WHERE id = $1`,
    [reportId, status, adminNote ?? null, closing, adminId],
  );
  if (!rowCount) throw ApiError.notFound('Report not found');
}
