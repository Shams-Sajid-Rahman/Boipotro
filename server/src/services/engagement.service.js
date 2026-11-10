import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { toCardDto } from './listing.service.js';

// ---------- Wishlist ----------

async function assertVisibleListing(listingId) {
  const { rows } = await query('SELECT seller_id, status, buyer_id FROM listings WHERE id = $1', [listingId]);
  if (!rows[0] || rows[0].status === 'removed') throw ApiError.notFound('Listing not found');
  return rows[0];
}

export async function listWishlist(userId) {
  const { rows } = await query(
    `SELECT l.id, l.title, l.author, l.isbn, l.edition, l.condition, l.price, l.status,
            l.view_count, l.created_at, l.seller_id,
            c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
            un.id AS university_id, un.name AS university_name, true AS is_wishlisted,
            (SELECT li.url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position LIMIT 1) AS cover_url
     FROM wishlist w
     JOIN listings l ON l.id = w.listing_id
     JOIN categories c ON c.id = l.category_id
     LEFT JOIN universities un ON un.id = l.university_id
     WHERE w.user_id = $1 AND l.status <> 'removed'
     ORDER BY w.created_at DESC`,
    [userId],
  );
  return rows.map(toCardDto);
}

export async function addToWishlist(userId, listingId) {
  await assertVisibleListing(listingId);
  await query(
    'INSERT INTO wishlist (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, listingId],
  );
}

export async function removeFromWishlist(userId, listingId) {
  await query('DELETE FROM wishlist WHERE user_id = $1 AND listing_id = $2', [userId, listingId]);
}

// ---------- Reviews ----------

/** Only the buyer of a sold listing may review its seller, once. */
export async function createReview(listingId, reviewerId, { rating, comment }) {
  const listing = await assertVisibleListing(listingId);
  if (listing.status !== 'sold' || listing.buyer_id !== reviewerId) {
    throw ApiError.forbidden('Only the buyer of a sold book can review the seller');
  }
  try {
    const { rows } = await query(
      `INSERT INTO reviews (reviewer_id, seller_id, listing_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, rating, comment, created_at`,
      [reviewerId, listing.seller_id, listingId, rating, comment ?? null],
    );
    return { id: rows[0].id, rating: rows[0].rating, comment: rows[0].comment, createdAt: rows[0].created_at };
  } catch (err) {
    if (err.code === '23505') throw ApiError.conflict('You have already reviewed this purchase');
    throw err;
  }
}

export async function listSellerReviews(sellerId) {
  const { rows } = await query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.id AS reviewer_id, u.name AS reviewer_name,
            l.id AS listing_id, l.title AS listing_title
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     LEFT JOIN listings l ON l.id = r.listing_id
     WHERE r.seller_id = $1
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [sellerId],
  );
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    reviewer: { id: r.reviewer_id, name: r.reviewer_name },
    listing: r.listing_id ? { id: r.listing_id, title: r.listing_title } : null,
  }));
}

// ---------- Reports ----------

export async function createReport(listingId, reporterId, { reason, details }) {
  const listing = await assertVisibleListing(listingId);
  if (listing.seller_id === reporterId) throw ApiError.badRequest('You cannot report your own listing');
  try {
    await query(
      'INSERT INTO reports (reporter_id, listing_id, reason, details) VALUES ($1, $2, $3, $4)',
      [reporterId, listingId, reason, details ?? null],
    );
  } catch (err) {
    if (err.code === '23505') throw ApiError.conflict('You have already reported this listing');
    throw err;
  }
}
