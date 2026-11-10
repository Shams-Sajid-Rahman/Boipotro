import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

const OFFER_SELECT = `
  SELECT o.id, o.amount, o.message, o.status, o.created_at,
         l.id AS listing_id, l.title AS listing_title, l.price AS listing_price, l.status AS listing_status,
         (SELECT li.url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position LIMIT 1) AS cover_url,
         b.id AS buyer_id, b.name AS buyer_name, s.id AS seller_id, s.name AS seller_name
  FROM offers o
  JOIN listings l ON l.id = o.listing_id
  JOIN users b ON b.id = o.buyer_id
  JOIN users s ON s.id = l.seller_id`;

const toOfferDto = (r) => ({
  id: r.id,
  amount: r.amount,
  message: r.message,
  status: r.status,
  createdAt: r.created_at,
  listing: { id: r.listing_id, title: r.listing_title, price: r.listing_price, status: r.listing_status, coverUrl: r.cover_url },
  buyer: { id: r.buyer_id, name: r.buyer_name },
  seller: { id: r.seller_id, name: r.seller_name },
});

async function getOffer(id, db = { query }) {
  const { rows } = await db.query(`${OFFER_SELECT} WHERE o.id = $1`, [id]);
  return rows[0] ? toOfferDto(rows[0]) : null;
}

export async function createOffer(listingId, buyerId, { amount, message }) {
  const { rows } = await query('SELECT seller_id, status FROM listings WHERE id = $1', [listingId]);
  const listing = rows[0];
  if (!listing || listing.status === 'removed') throw ApiError.notFound('Listing not found');
  if (listing.seller_id === buyerId) throw ApiError.badRequest('You cannot make an offer on your own listing');
  if (listing.status !== 'active') throw ApiError.badRequest('This book is no longer available');

  try {
    const { rows: [offer] } = await query(
      'INSERT INTO offers (listing_id, buyer_id, amount, message) VALUES ($1, $2, $3, $4) RETURNING id',
      [listingId, buyerId, amount, message ?? null],
    );
    return getOffer(offer.id);
  } catch (err) {
    if (err.code === '23505') throw ApiError.conflict('You already have a pending offer on this book');
    throw err;
  }
}

export async function listSentOffers(userId) {
  const { rows } = await query(`${OFFER_SELECT} WHERE o.buyer_id = $1 ORDER BY o.created_at DESC`, [userId]);
  return rows.map(toOfferDto);
}

export async function listReceivedOffers(userId) {
  const { rows } = await query(`${OFFER_SELECT} WHERE l.seller_id = $1 ORDER BY o.created_at DESC`, [userId]);
  return rows.map(toOfferDto);
}

/**
 * Seller: accept / reject. Buyer: cancel. Only pending offers can change.
 * Accepting reserves the listing and rejects the other pending offers.
 */
export async function updateOfferStatus(offerId, userId, status) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT o.id, o.status, o.buyer_id, o.listing_id, l.seller_id, l.status AS listing_status
       FROM offers o JOIN listings l ON l.id = o.listing_id
       WHERE o.id = $1 FOR UPDATE OF o, l`,
      [offerId],
    );
    const offer = rows[0];
    if (!offer) throw ApiError.notFound('Offer not found');

    const isSeller = offer.seller_id === userId;
    const isBuyer = offer.buyer_id === userId;
    if (!isSeller && !isBuyer) throw ApiError.notFound('Offer not found');
    if (status === 'cancelled' && !isBuyer) throw ApiError.forbidden('Only the buyer can cancel an offer');
    if (status !== 'cancelled' && !isSeller) throw ApiError.forbidden('Only the seller can accept or reject an offer');
    if (offer.status !== 'pending') throw ApiError.badRequest(`This offer is already ${offer.status}`);

    if (status === 'accepted') {
      if (offer.listing_status !== 'active') throw ApiError.badRequest('This listing is no longer active');
      await client.query("UPDATE listings SET status = 'reserved' WHERE id = $1", [offer.listing_id]);
      await client.query(
        "UPDATE offers SET status = 'rejected' WHERE listing_id = $1 AND status = 'pending' AND id <> $2",
        [offer.listing_id, offerId],
      );
    }
    await client.query('UPDATE offers SET status = $2 WHERE id = $1', [offerId, status]);
  });
  return getOffer(offerId);
}
