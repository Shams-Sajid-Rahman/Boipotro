import { query } from '../db/pool.js';

export async function listCategories() {
  const { rows } = await query(
    `SELECT c.id, c.name, c.slug,
            count(l.id) FILTER (WHERE l.status = 'active') AS active_listings
     FROM categories c LEFT JOIN listings l ON l.category_id = c.id
     GROUP BY c.id ORDER BY c.name`,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, activeListings: r.active_listings }));
}

export async function listUniversities() {
  const { rows } = await query('SELECT id, name, email_domain, city FROM universities ORDER BY name');
  return rows.map((r) => ({ id: r.id, name: r.name, emailDomain: r.email_domain, city: r.city }));
}

/** All site_content rows as { key: value }. */
export async function getSiteContent() {
  const { rows } = await query('SELECT key, value FROM site_content');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function saveContactMessage({ name, email, subject, message }, userId) {
  await query(
    'INSERT INTO contact_messages (name, email, subject, message, user_id) VALUES ($1, $2, $3, $4, $5)',
    [name, email, subject, message, userId ?? null],
  );
}
