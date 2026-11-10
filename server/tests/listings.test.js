import { api, login, bearer, closePool, createListing, categoryId, USERS, PNG } from './helpers.js';

afterAll(closePool);

describe('GET /api/listings (search, filter, paginate)', () => {
  test('returns the pagination envelope with only active listings', async () => {
    const res = await api().get('/api/listings?limit=5');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 5, total: expect.any(Number), totalPages: expect.any(Number) });
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data.every((l) => l.status === 'active')).toBe(true);
    // Seed: 30 listings, 2 reserved, 2 sold -> 26 active.
    expect(res.body.total).toBe(26);
  });

  test('q matches title, author and ISBN case-insensitively', async () => {
    const byTitle = await api().get('/api/listings?q=CALCULUS');
    expect(byTitle.body.data.map((l) => l.title)).toEqual(
      expect.arrayContaining(['Calculus: Early Transcendentals', "Thomas' Calculus"]),
    );
    const byAuthor = await api().get('/api/listings?q=mankiw');
    expect(byAuthor.body.total).toBe(2);
    const byIsbn = await api().get('/api/listings?q=978-0262033848');
    expect(byIsbn.body.data[0].title).toBe('Introduction to Algorithms');
  });

  test('filters combine (category + condition + price range) and sort applies', async () => {
    const res = await api().get('/api/listings?category=cse&condition=used,heavily_used&minPrice=300&maxPrice=900&sort=price_asc');
    expect(res.status).toBe(200);
    const prices = res.body.data.map((l) => l.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    for (const l of res.body.data) {
      expect(l.category.slug).toBe('cse');
      expect(['used', 'heavily_used']).toContain(l.condition);
      expect(l.price).toBeGreaterThanOrEqual(300);
      expect(l.price).toBeLessThanOrEqual(900);
    }
  });

  test('rejects bad query values', async () => {
    expect((await api().get('/api/listings?sort=random')).status).toBe(400);
    expect((await api().get('/api/listings?minPrice=900&maxPrice=100')).status).toBe(400);
    expect((await api().get('/api/listings?condition=mint')).status).toBe(400);
  });

  test('wildcards in q are treated literally', async () => {
    const res = await api().get('/api/listings?q=%25');
    expect(res.body.total).toBe(0);
  });

  test('featured returns at most 10 active listings', async () => {
    const res = await api().get('/api/listings/featured');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(10);
    const views = res.body.data.map((l) => l.viewCount);
    expect(views).toEqual([...views].sort((a, b) => b - a));
  });
});

describe('listing CRUD + permissions', () => {
  let owner;
  let other;
  let admin;
  beforeAll(async () => {
    owner = await login(USERS.tanvir);
    other = await login(USERS.nusrat);
    admin = await login(USERS.admin);
  });

  test('anonymous users cannot create listings', async () => {
    const res = await api().post('/api/listings').field('title', 'x');
    expect(res.status).toBe(401);
  });

  test('create requires at least one image and valid fields', async () => {
    const res = await api().post('/api/listings').set(bearer(owner.token))
      .field('title', 'A').field('author', 'B').field('price', '-5').field('condition', 'mint').field('categoryId', '1');
    expect(res.status).toBe(400);
  });

  test('a non-image file disguised as PNG is rejected', async () => {
    const res = await api().post('/api/listings').set(bearer(owner.token))
      .field('title', 'Fake image book').field('author', 'Someone').field('price', '100')
      .field('condition', 'used').field('categoryId', String(await categoryId()))
      .attach('images', Buffer.from('<?php echo 1; ?>'), { filename: 'evil.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/not a valid/);
  });

  test('create -> fetch -> it appears in search -> view count rises', async () => {
    const listing = await createListing(owner.token, { title: 'Clean Architecture Unique', isbn: '978-0134494166' });
    expect(listing.isbn).toBe('9780134494166');
    expect(listing.images[0].url).toMatch(/^\/uploads\/listings\/.+\.png$/);
    expect(listing.university.name).toBe('North South University'); // defaults to seller's

    const found = await api().get('/api/listings?q=clean architecture unique');
    expect(found.body.data.map((l) => l.id)).toContain(listing.id);

    const first = await api().get(`/api/listings/${listing.id}`);
    const second = await api().get(`/api/listings/${listing.id}`);
    expect(second.body.listing.viewCount).toBe(first.body.listing.viewCount + 1);
    expect(second.body.listing.seller).toMatchObject({ name: 'Tanvir Hasan', university: 'North South University' });

    const img = await api().get(listing.images[0].url);
    expect(img.status).toBe(200);
  });

  test('only the owner or an admin can edit, change status or delete', async () => {
    const listing = await createListing(owner.token);

    expect((await api().patch(`/api/listings/${listing.id}`).set(bearer(other.token)).send({ price: 1 })).status).toBe(403);
    expect((await api().delete(`/api/listings/${listing.id}`).set(bearer(other.token))).status).toBe(403);

    const edited = await api().patch(`/api/listings/${listing.id}`).set(bearer(owner.token)).send({ price: 650, title: 'TDD by Example' });
    expect(edited.status).toBe(200);
    expect(edited.body.listing).toMatchObject({ price: 650, title: 'TDD by Example' });

    const byAdmin = await api().patch(`/api/listings/${listing.id}/status`).set(bearer(admin.token)).send({ status: 'reserved' });
    expect(byAdmin.body.listing.status).toBe('reserved');

    expect((await api().delete(`/api/listings/${listing.id}`).set(bearer(owner.token))).status).toBe(204);
    expect((await api().get(`/api/listings/${listing.id}`)).status).toBe(404);
  });

  test('can add and remove images (max 5, min 1)', async () => {
    const listing = await createListing(owner.token);
    let req = api().patch(`/api/listings/${listing.id}`).set(bearer(owner.token));
    for (let i = 0; i < 4; i += 1) req = req.attach('images', PNG, { filename: `p${i}.png`, contentType: 'image/png' });
    const five = await req;
    expect(five.body.listing.images).toHaveLength(5);

    const sixth = await api().patch(`/api/listings/${listing.id}`).set(bearer(owner.token))
      .attach('images', PNG, { filename: 'p6.png', contentType: 'image/png' });
    expect(sixth.status).toBe(400);

    const ids = five.body.listing.images.map((i) => i.id);
    const removed = await api().patch(`/api/listings/${listing.id}`).set(bearer(owner.token)).field('removeImageIds', ids.slice(0, 2).join(','));
    expect(removed.body.listing.images.map((i) => i.position)).toEqual([0, 1, 2]);

    const all = await api().patch(`/api/listings/${listing.id}`).set(bearer(owner.token)).send({ removeImageIds: ids });
    expect(all.status).toBe(400);
  });

  test('GET /users/me/listings returns only my non-removed listings', async () => {
    const res = await api().get('/api/users/me/listings').set(bearer(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.data.every((l) => l.sellerId === owner.user.id && l.status !== 'removed')).toBe(true);
  });

  test('categories and universities are public', async () => {
    const cats = await api().get('/api/categories');
    expect(cats.body.data).toHaveLength(8);
    const unis = await api().get('/api/universities');
    expect(unis.body.data.map((u) => u.name)).toContain('North South University');
  });
});
