import bcrypt from 'bcrypt';
import { pool, withTransaction } from '../pool.js';
import { isProd } from '../../config/env.js';
import { universities } from './data/universities.js';
import { categories } from './data/categories.js';
import { users } from './data/users.js';
import { listings } from './data/listings.js';
import { conversations, offers, wishlist, reviews } from './data/activity.js';

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Password123!';

// One placeholder colour per category so covers are easy to tell apart.
const COVER_COLORS = {
  chemistry: '0B1F4B', mathematics: '1E6BFF', cse: '132C63', business: 'F26B21',
  physics: '1C3A7A', economics: '0F766E', eee: '7C3AED', english: 'B91C1C',
};

const placeholderImage = (text, bg, fg = 'FFFFFF') =>
  `https://placehold.co/400x560/${bg}/${fg}/png?text=${encodeURIComponent(text)}`;

/** Insert rows one by one with a fixed, parameterized statement; returns Map(key -> id). */
async function insertAll(client, rows, sql, toParams, toKey) {
  const ids = new Map();
  for (const row of rows) {
    const { rows: [inserted] } = await client.query(sql, toParams(row));
    ids.set(toKey(row), inserted.id);
  }
  return ids;
}

const lookup = (map, key, label) => {
  if (!map.has(key)) throw new Error(`Seed data error: unknown ${label} "${key}"`);
  return map.get(key);
};

async function clearTables(client) {
  await client.query(`
    TRUNCATE contact_messages, reports, reviews, wishlist, messages, conversations, offers,
             listing_images, listings, categories, refresh_tokens, users, universities
    RESTART IDENTITY CASCADE
  `);
}

async function seedUniversities(client) {
  return insertAll(
    client,
    universities,
    'INSERT INTO universities (name, email_domain, city) VALUES ($1, $2, $3) RETURNING id',
    (u) => [u.name, u.emailDomain, u.city],
    (u) => u.emailDomain,
  );
}

async function seedCategories(client) {
  return insertAll(
    client,
    categories,
    'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id',
    (c) => [c.name, c.slug],
    (c) => c.slug,
  );
}

async function seedUsers(client, universityIds) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const avatar = (name) => `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;

  return insertAll(
    client,
    users,
    `INSERT INTO users (name, email, password_hash, phone, university_id, department, role, is_verified, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    (u) => [
      u.name, u.email, passwordHash, u.phone,
      u.university ? lookup(universityIds, u.university, 'university') : null,
      u.department, u.role, u.isVerified, avatar(u.name),
    ],
    (u) => u.email,
  );
}

async function seedListings(client, { userIds, categoryIds, universityIds }) {
  const sellerUniversity = new Map(users.map((u) => [u.email, u.university]));

  const listingIds = await insertAll(
    client,
    listings,
    `INSERT INTO listings
       (seller_id, title, author, isbn, edition, category_id, university_id,
        condition, price, description, status, view_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
             now() - make_interval(days => $13), now() - make_interval(days => $13))
     RETURNING id`,
    (l) => {
      const uni = sellerUniversity.get(l.seller);
      return [
        lookup(userIds, l.seller, 'seller'), l.title, l.author, l.isbn, l.edition,
        lookup(categoryIds, l.category, 'category'), uni ? universityIds.get(uni) : null,
        l.condition, l.price, l.description, l.status, l.views, l.daysAgo,
      ];
    },
    (l) => l.title,
  );

  for (const l of listings) {
    const listingId = listingIds.get(l.title);
    const bg = COVER_COLORS[l.category];
    const images = [placeholderImage(l.title, bg)];
    for (let i = 0; i < (l.extraImages || 0); i += 1) images.push(placeholderImage('Back cover', 'F1F5F9', bg));

    for (const [position, url] of images.entries()) {
      await client.query(
        'INSERT INTO listing_images (listing_id, url, position) VALUES ($1, $2, $3)',
        [listingId, url, position],
      );
    }
  }
  return listingIds;
}

async function seedActivity(client, { userIds, listingIds }) {
  const sellerOf = new Map(listings.map((l) => [l.title, l.seller]));

  for (const c of conversations) {
    const buyerId = lookup(userIds, c.buyer, 'buyer');
    const sellerId = lookup(userIds, sellerOf.get(c.listing), 'seller');
    const { rows: [conv] } = await client.query(
      `INSERT INTO conversations (listing_id, buyer_id, seller_id, created_at)
       VALUES ($1, $2, $3, now() - interval '1 day') RETURNING id`,
      [lookup(listingIds, c.listing, 'listing'), buyerId, sellerId],
    );
    // Oldest first, a few minutes apart; all but the last message are read.
    for (const [i, m] of c.messages.entries()) {
      const minutesAgo = (c.messages.length - i) * 7;
      const isLast = i === c.messages.length - 1;
      await client.query(
        `INSERT INTO messages (conversation_id, sender_id, body, created_at, read_at)
         VALUES ($1, $2, $3, now() - make_interval(mins => $4),
                 CASE WHEN $5 THEN NULL ELSE now() - make_interval(mins => $4) END)`,
        [conv.id, m.from === 'buyer' ? buyerId : sellerId, m.body, minutesAgo, isLast],
      );
    }
  }

  for (const o of offers) {
    await client.query(
      'INSERT INTO offers (listing_id, buyer_id, amount, message, status) VALUES ($1, $2, $3, $4, $5)',
      [lookup(listingIds, o.listing, 'listing'), lookup(userIds, o.buyer, 'buyer'), o.amount, o.message, o.status],
    );
  }

  for (const w of wishlist) {
    await client.query(
      'INSERT INTO wishlist (user_id, listing_id) VALUES ($1, $2)',
      [lookup(userIds, w.user, 'user'), lookup(listingIds, w.listing, 'listing')],
    );
  }

  for (const r of reviews) {
    // The reviewer bought the (sold) book.
    await client.query('UPDATE listings SET buyer_id = $1 WHERE id = $2', [
      lookup(userIds, r.reviewer, 'reviewer'), lookup(listingIds, r.listing, 'listing'),
    ]);
    await client.query(
      'INSERT INTO reviews (reviewer_id, seller_id, listing_id, rating, comment) VALUES ($1, $2, $3, $4, $5)',
      [
        lookup(userIds, r.reviewer, 'reviewer'), lookup(userIds, sellerOf.get(r.listing), 'seller'),
        lookup(listingIds, r.listing, 'listing'), r.rating, r.comment,
      ],
    );
  }
}

async function seed() {
  if (isProd) throw new Error('Refusing to seed in production (it wipes all data).');

  await withTransaction(async (client) => {
    await clearTables(client);
    const universityIds = await seedUniversities(client);
    const categoryIds = await seedCategories(client);
    const userIds = await seedUsers(client, universityIds);
    const listingIds = await seedListings(client, { userIds, categoryIds, universityIds });
    await seedActivity(client, { userIds, listingIds });
  });

  console.log(
    `Seeded ${universities.length} universities, ${categories.length} categories, ` +
      `${users.length} users, ${listings.length} listings (+ sample chats, offers, wishlist, reviews).`,
  );
  console.log(`All seed users share the password: ${SEED_PASSWORD}`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
