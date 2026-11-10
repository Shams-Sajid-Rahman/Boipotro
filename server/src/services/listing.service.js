import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { isOwnerOrAdmin } from '../middleware/auth.js';
import { MAX_LISTING_IMAGES, publicUrlFor, localPathFor, removeFiles } from '../middleware/upload.js';
import { normalizeIsbn } from '../validators/listing.validators.js';

// ---------- Shared SQL fragments (constants only; all values go through $n params) ----------

const CARD_COLUMNS = `
  l.id, l.title, l.author, l.isbn, l.edition, l.condition, l.price, l.status,
  l.view_count, l.created_at, l.seller_id,
  c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
  un.id AS university_id, un.name AS university_name,
  (SELECT li.url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position LIMIT 1) AS cover_url`;

const CARD_FROM = `
  FROM listings l
  JOIN categories c ON c.id = l.category_id
  LEFT JOIN universities un ON un.id = l.university_id`;

/** "Is this in the viewer's wishlist?" column; viewer id param may be NULL (anonymous). */
const wishlistedColumn = (param) =>
  `EXISTS (SELECT 1 FROM wishlist w WHERE w.listing_id = l.id AND w.user_id = ${param}) AS is_wishlisted`;

const SORT_SQL = {
  newest: 'l.created_at DESC, l.id DESC',
  price_asc: 'l.price ASC, l.id DESC',
  price_desc: 'l.price DESC, l.id DESC',
  popular: 'l.view_count DESC, l.created_at DESC',
};

export const toCardDto = (r) => ({
  id: r.id,
  title: r.title,
  author: r.author,
  isbn: r.isbn,
  edition: r.edition,
  condition: r.condition,
  price: r.price,
  status: r.status,
  viewCount: r.view_count,
  createdAt: r.created_at,
  sellerId: r.seller_id,
  coverUrl: r.cover_url,
  category: { id: r.category_id, name: r.category_name, slug: r.category_slug },
  university: r.university_id ? { id: r.university_id, name: r.university_name } : null,
  isWishlisted: Boolean(r.is_wishlisted),
});

/** Collects parameter values and hands back their $n placeholders. */
function paramList() {
  const values = [];
  return { values, add: (v) => { values.push(v); return `$${values.length}`; } };
}

/** Escape LIKE wildcards so user input is matched literally. */
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

// ---------- Search / featured / mine ----------

export async function searchListings(filters, viewerId = null) {
  const p = paramList();
  const where = ["l.status = 'active'"];

  if (filters.q) {
    const like = p.add(`%${escapeLike(filters.q)}%`);
    where.push(`(
      l.search_vector @@ websearch_to_tsquery('simple', ${p.add(filters.q)})
      OR l.title ILIKE ${like} OR l.author ILIKE ${like}
      OR l.isbn = ${p.add(normalizeIsbn(filters.q))}
    )`);
  }
  if (filters.category) {
    where.push(/^\d+$/.test(filters.category)
      ? `l.category_id = ${p.add(Number(filters.category))}`
      : `c.slug = ${p.add(filters.category)}`);
  }
  if (filters.university) where.push(`l.university_id = ${p.add(filters.university)}`);
  if (filters.condition?.length) where.push(`l.condition = ANY(${p.add(filters.condition)}::text[])`);
  if (filters.minPrice !== undefined) where.push(`l.price >= ${p.add(filters.minPrice)}`);
  if (filters.maxPrice !== undefined) where.push(`l.price <= ${p.add(filters.maxPrice)}`);

  const whereSql = where.join(' AND ');
  const { rows: [{ total }] } = await query(`SELECT count(*) AS total ${CARD_FROM} WHERE ${whereSql}`, p.values);

  const { page, limit } = filters;
  const viewer = p.add(viewerId);
  const { rows } = await query(
    `SELECT ${CARD_COLUMNS}, ${wishlistedColumn(viewer)}
     ${CARD_FROM}
     WHERE ${whereSql}
     ORDER BY ${SORT_SQL[filters.sort]}
     LIMIT ${p.add(limit)} OFFSET ${p.add((page - 1) * limit)}`,
    p.values,
  );

  return { data: rows.map(toCardDto), page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getFeaturedListings({ by, limit }, viewerId = null) {
  const order = by === 'latest' ? SORT_SQL.newest : SORT_SQL.popular;
  const { rows } = await query(
    `SELECT ${CARD_COLUMNS}, ${wishlistedColumn('$1')}
     ${CARD_FROM}
     WHERE l.status = 'active'
     ORDER BY ${order}
     LIMIT $2`,
    [viewerId, limit],
  );
  return rows.map(toCardDto);
}

export async function getMyListings(userId, { status }) {
  const { rows } = await query(
    `SELECT ${CARD_COLUMNS}, false AS is_wishlisted,
            (SELECT count(*) FROM offers o WHERE o.listing_id = l.id AND o.status = 'pending') AS pending_offers
     ${CARD_FROM}
     WHERE l.seller_id = $1 AND l.status <> 'removed' AND ($2::text IS NULL OR l.status = $2)
     ORDER BY l.created_at DESC`,
    [userId, status ?? null],
  );
  return rows.map((r) => ({ ...toCardDto(r), pendingOffers: r.pending_offers }));
}

// ---------- Details ----------

async function fetchListingDetail(id, viewerId, db = { query }) {
  const { rows } = await db.query(
    `SELECT l.id, l.title, l.author, l.isbn, l.edition, l.condition, l.price, l.description,
            l.status, l.view_count, l.created_at, l.updated_at, l.seller_id, l.buyer_id,
            c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
            un.id AS university_id, un.name AS university_name,
            s.name AS seller_name, s.avatar_url AS seller_avatar, s.is_verified AS seller_verified,
            s.department AS seller_department, s.created_at AS seller_joined,
            su.name AS seller_university,
            r.rating_avg, r.review_count,
            COALESCE((SELECT json_agg(json_build_object('id', li.id, 'url', li.url, 'position', li.position)
                                      ORDER BY li.position)
                      FROM listing_images li WHERE li.listing_id = l.id), '[]') AS images,
            EXISTS (SELECT 1 FROM wishlist w WHERE w.listing_id = l.id AND w.user_id = $2) AS is_wishlisted,
            (SELECT o.id FROM offers o WHERE o.listing_id = l.id AND o.buyer_id = $2 AND o.status = 'pending') AS my_pending_offer_id,
            (SELECT cv.id FROM conversations cv WHERE cv.listing_id = l.id AND cv.buyer_id = $2) AS my_conversation_id,
            EXISTS (SELECT 1 FROM reviews rv WHERE rv.listing_id = l.id AND rv.reviewer_id = $2) AS has_reviewed
     FROM listings l
     JOIN categories c ON c.id = l.category_id
     LEFT JOIN universities un ON un.id = l.university_id
     JOIN users s ON s.id = l.seller_id
     LEFT JOIN universities su ON su.id = s.university_id
     LEFT JOIN LATERAL (
       SELECT round(avg(rating), 1) AS rating_avg, count(*) AS review_count
       FROM reviews WHERE seller_id = s.id
     ) r ON true
     WHERE l.id = $1`,
    [id, viewerId],
  );
  return rows[0] || null;
}

function toDetailDto(r, viewer) {
  const isOwner = viewer?.id === r.seller_id;
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    isbn: r.isbn,
    edition: r.edition,
    condition: r.condition,
    price: r.price,
    description: r.description,
    status: r.status,
    viewCount: r.view_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    category: { id: r.category_id, name: r.category_name, slug: r.category_slug },
    university: r.university_id ? { id: r.university_id, name: r.university_name } : null,
    images: r.images,
    seller: {
      id: r.seller_id,
      name: r.seller_name,
      avatarUrl: r.seller_avatar,
      isVerified: r.seller_verified,
      department: r.seller_department,
      university: r.seller_university,
      joinedAt: r.seller_joined,
      ratingAvg: r.rating_avg,
      reviewCount: r.review_count,
    },
    viewer: {
      isOwner,
      canEdit: isOwnerOrAdmin(viewer, r.seller_id),
      isWishlisted: r.is_wishlisted,
      pendingOfferId: r.my_pending_offer_id,
      conversationId: r.my_conversation_id,
      canReview: Boolean(viewer) && r.status === 'sold' && r.buyer_id === viewer.id && !r.has_reviewed,
    },
  };
}

export async function getListingById(id, viewer) {
  const row = await fetchListingDetail(id, viewer?.id ?? null);
  if (!row || (row.status === 'removed' && !isOwnerOrAdmin(viewer, row.seller_id))) {
    throw ApiError.notFound('Listing not found');
  }
  if (viewer?.id !== row.seller_id) {
    const { rows } = await query(
      'UPDATE listings SET view_count = view_count + 1 WHERE id = $1 RETURNING view_count',
      [id],
    );
    row.view_count = rows[0].view_count;
  }
  return toDetailDto(row, viewer);
}

// ---------- Write operations ----------

/** Locks the listing row; 404 if missing/removed, 403 unless owner or admin. */
async function lockForModify(client, id, user) {
  const { rows } = await client.query('SELECT id, seller_id, status FROM listings WHERE id = $1 FOR UPDATE', [id]);
  const listing = rows[0];
  if (!listing || listing.status === 'removed') throw ApiError.notFound('Listing not found');
  if (!isOwnerOrAdmin(user, listing.seller_id)) throw ApiError.forbidden('You can only change your own listings');
  return listing;
}

async function assertCategoryExists(client, categoryId) {
  const { rowCount } = await client.query('SELECT 1 FROM categories WHERE id = $1', [categoryId]);
  if (!rowCount) throw ApiError.badRequest('Validation failed', [{ field: 'categoryId', message: 'Unknown category' }]);
}

async function insertImages(client, listingId, urls, startPosition = 0) {
  for (const [i, url] of urls.entries()) {
    await client.query(
      'INSERT INTO listing_images (listing_id, url, position) VALUES ($1, $2, $3)',
      [listingId, url, startPosition + i],
    );
  }
}

export async function createListing(seller, data, files = []) {
  if (!files.length) {
    throw ApiError.badRequest('Validation failed', [{ field: 'images', message: 'Add at least one photo of the book' }]);
  }
  const id = await withTransaction(async (client) => {
    await assertCategoryExists(client, data.categoryId);
    const { rows } = await client.query(
      `INSERT INTO listings
         (seller_id, title, author, isbn, edition, category_id, university_id, condition, price, description)
       VALUES ($1, $2, $3, $4, $5, $6,
               COALESCE($7, (SELECT university_id FROM users WHERE id = $1)),
               $8, $9, $10)
       RETURNING id`,
      [seller.id, data.title, data.author, data.isbn ?? null, data.edition ?? null, data.categoryId,
       data.universityId ?? null, data.condition, data.price, data.description ?? null],
    );
    await insertImages(client, rows[0].id, files.map((f) => publicUrlFor(f.filename)));
    return rows[0].id;
  });
  return toDetailDto(await fetchListingDetail(id, seller.id), seller);
}

// API field -> column. Column names are constants, never user input.
const UPDATABLE_COLUMNS = {
  title: 'title', author: 'author', isbn: 'isbn', edition: 'edition', categoryId: 'category_id',
  universityId: 'university_id', condition: 'condition', price: 'price', description: 'description',
};

export async function updateListing(id, user, { removeImageIds = [], ...fields }, files = []) {
  const removedPaths = [];

  await withTransaction(async (client) => {
    await lockForModify(client, id, user);
    if (fields.categoryId) await assertCategoryExists(client, fields.categoryId);

    const p = paramList();
    const sets = Object.entries(fields)
      .filter(([key, value]) => UPDATABLE_COLUMNS[key] && value !== undefined)
      .map(([key, value]) => `${UPDATABLE_COLUMNS[key]} = ${p.add(value)}`);
    if (sets.length) {
      await client.query(`UPDATE listings SET ${sets.join(', ')} WHERE id = ${p.add(id)}`, p.values);
    }

    const { rows: current } = await client.query(
      'SELECT id, url FROM listing_images WHERE listing_id = $1 ORDER BY position',
      [id],
    );
    const removeSet = new Set(removeImageIds);
    const kept = current.filter((img) => !removeSet.has(img.id));
    const finalUrls = [...kept.map((img) => img.url), ...files.map((f) => publicUrlFor(f.filename))];

    if (finalUrls.length === 0) throw ApiError.badRequest('A listing needs at least one photo');
    if (finalUrls.length > MAX_LISTING_IMAGES) {
      throw ApiError.badRequest(`A listing can have at most ${MAX_LISTING_IMAGES} photos`);
    }

    if (removeSet.size || files.length) {
      const removed = current.filter((img) => removeSet.has(img.id));
      await client.query('DELETE FROM listing_images WHERE listing_id = $1 AND id = ANY($2::bigint[])', [
        id, removed.map((img) => img.id),
      ]);
      // Re-number kept photos from 0 (keeping their ids) so the first is always the cover.
      // Shift first to dodge the UNIQUE (listing_id, position) constraint mid-update.
      await client.query('UPDATE listing_images SET position = position + 1000 WHERE listing_id = $1', [id]);
      for (const [position, img] of kept.entries()) {
        await client.query('UPDATE listing_images SET position = $2 WHERE id = $1', [img.id, position]);
      }
      await insertImages(client, id, files.map((f) => publicUrlFor(f.filename)), kept.length);
      removedPaths.push(...removed.map((img) => localPathFor(img.url)));
    }
  });

  // Delete files only after the transaction committed.
  await removeFiles(removedPaths);
  return toDetailDto(await fetchListingDetail(id, user.id), user);
}

export async function updateListingStatus(id, user, status) {
  await withTransaction(async (client) => {
    await lockForModify(client, id, user);
    // Sold: the buyer is whoever had the accepted offer (enables their review).
    // Back to active: clear any buyer and reopen.
    await client.query(
      `UPDATE listings
       SET status = $2,
           buyer_id = CASE
             WHEN $2 = 'sold' THEN (SELECT o.buyer_id FROM offers o
                                    WHERE o.listing_id = $1 AND o.status = 'accepted'
                                    ORDER BY o.created_at DESC LIMIT 1)
             ELSE NULL END
       WHERE id = $1`,
      [id, status],
    );
    if (status !== 'reserved') {
      // Sold or reopened: pending offers no longer apply.
      await client.query(
        `UPDATE offers SET status = 'rejected' WHERE listing_id = $1 AND status = 'pending' AND $2 = 'sold'`,
        [id, status],
      );
    }
  });
  return toDetailDto(await fetchListingDetail(id, user.id), user);
}

/** Soft delete: keeps chats, offers and reviews intact; hides the listing everywhere. */
export async function deleteListing(id, user) {
  await withTransaction(async (client) => {
    await lockForModify(client, id, user);
    await client.query("UPDATE listings SET status = 'removed' WHERE id = $1", [id]);
    await client.query("UPDATE offers SET status = 'cancelled' WHERE listing_id = $1 AND status = 'pending'", [id]);
  });
}
