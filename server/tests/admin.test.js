import { api, login, bearer, closePool, createListing, USERS } from './helpers.js';

afterAll(closePool);

let admin;
let student;
beforeAll(async () => {
  admin = await login(USERS.admin);
  student = await login(USERS.tanvir);
});

const asAdmin = (method, url) => api()[method](`/api/admin${url}`).set(bearer(admin.token));

test.each([
  ['get', '/sales'], ['get', '/chats'], ['get', '/chats/stats'], ['get', '/audit'], ['get', '/users/1'],
  ['post', '/users'], ['post', '/categories'], ['put', '/site-content/fees'],
])('%s %s is 403 for students', async (method, url) => {
  expect((await api()[method](`/api/admin${url}`).set(bearer(student.token)).send({})).status).toBe(403);
});

test('user CRUD: create, read, update (role/password), delete', async () => {
  const created = await asAdmin('post', '/users').send({ name: 'Admin Made', email: 'made@test.bd', password: 'secret123', isVerified: true });
  expect(created.status).toBe(201);
  const id = created.body.user.id;
  expect(created.body.user).toMatchObject({ email: 'made@test.bd', isVerified: true, role: 'student' });

  const detail = await asAdmin('get', `/users/${id}`);
  expect(detail.body.user.stats).toMatchObject({ activeListings: 0, soldListings: 0 });

  const updated = await asAdmin('patch', `/users/${id}`).send({ name: 'Renamed', phone: '+8801711000000', password: 'newpass123' });
  expect(updated.body.user).toMatchObject({ name: 'Renamed', phone: '+8801711000000' });
  expect((await api().post('/api/auth/login').send({ email: 'made@test.bd', password: 'newpass123' })).status).toBe(200);

  expect((await asAdmin('post', '/users').send({ name: 'Dup', email: 'made@test.bd', password: 'secret123' })).status).toBe(409);
  expect((await asAdmin('patch', `/users/${admin.user.id}`).send({ role: 'student' })).status).toBe(400);
  expect((await asAdmin('delete', `/users/${admin.user.id}`)).status).toBe(400);

  await asAdmin('delete', `/users/${id}`).expect(204);
  expect((await asAdmin('get', `/users/${id}`)).status).toBe(404);
});

test('admin can post a listing on behalf of a user, remove, restore and permanently delete it', async () => {
  const listing = await createListing(admin.token, { title: 'Posted By Admin', sellerId: String(student.user.id) });
  expect(listing.seller.id).toBe(student.user.id);

  await asAdmin('delete', `/listings/${listing.id}`).expect(204);
  expect((await api().get(`/api/listings/${listing.id}`)).status).toBe(404);
  await asAdmin('post', `/listings/${listing.id}/restore`).expect(204);
  expect((await api().get(`/api/listings/${listing.id}`)).status).toBe(200);
  await asAdmin('delete', `/listings/${listing.id}/permanent`).expect(204);
  expect((await asAdmin('post', `/listings/${listing.id}/restore`)).status).toBe(404);
});

test('students cannot post on behalf of someone else (sellerId ignored)', async () => {
  const other = await login(USERS.nusrat);
  const listing = await createListing(student.token, { sellerId: String(other.user.id) });
  expect(listing.seller.id).toBe(student.user.id);
});

test('sales report: sale price = accepted offer, commission at current rate', async () => {
  await asAdmin('put', '/site-content/fees').send({ value: { commissionPercent: 10 } }).expect(204);
  expect((await asAdmin('put', '/site-content/fees').send({ value: { commissionPercent: 90 } })).status).toBe(400);

  const before = (await asAdmin('get', '/sales?days=7')).body;
  const buyer = await login(USERS.mehedi);
  const listing = await createListing(student.token, { price: '1000' });
  const offer = await api().post(`/api/listings/${listing.id}/offers`).set(bearer(buyer.token)).send({ amount: 800 });
  await api().patch(`/api/offers/${offer.body.offer.id}`).set(bearer(student.token)).send({ status: 'accepted' }).expect(200);
  await api().patch(`/api/listings/${listing.id}/status`).set(bearer(student.token)).send({ status: 'sold' }).expect(200);

  const after = (await asAdmin('get', '/sales?days=7')).body;
  expect(after.commissionPercent).toBe(10);
  expect(after.totals.sold).toBe(before.totals.sold + 1);
  expect(after.totals.gmv).toBe(before.totals.gmv + 800);
  expect(after.totals.earnings).toBeCloseTo(before.totals.earnings + 80);
  expect(after.daily).toHaveLength(7);
  expect(after.recent[0]).toMatchObject({ id: listing.id, soldPrice: 800, commission: 80 });

  await asAdmin('put', '/site-content/fees').send({ value: { commissionPercent: 5 } }).expect(204);
});

test('category and university CRUD', async () => {
  const cat = await asAdmin('post', '/categories').send({ name: 'Law & Policy' });
  expect(cat.body.category.slug).toBe('law-and-policy');
  await asAdmin('patch', `/categories/${cat.body.category.id}`).send({ name: 'Law' }).expect(200);
  await asAdmin('delete', `/categories/${cat.body.category.id}`).expect(204);
  // In-use category cannot be deleted.
  expect((await asAdmin('delete', '/categories/1')).status).toBe(409);

  const uni = await asAdmin('post', '/universities').send({ name: 'Independent University, Bangladesh', emailDomain: 'iub.edu.bd', city: 'Dhaka' });
  expect(uni.status).toBe(201);
  await asAdmin('delete', `/universities/${uni.body.university.id}`).expect(204);
});

test('chat activity: stats, list, and transcript views are audited', async () => {
  const stats = await asAdmin('get', '/chats/stats?days=7');
  expect(stats.body).toMatchObject({ conversations: expect.any(Number), daily: expect.any(Array) });

  const list = await asAdmin('get', '/chats');
  const convId = list.body.data[0].id;
  const transcript = await asAdmin('get', `/chats/${convId}`);
  expect(transcript.body.conversation.messages.length).toBeGreaterThan(0);

  const audit = await asAdmin('get', '/audit');
  expect(audit.body.data[0]).toMatchObject({ action: 'view_conversation', targetType: 'conversation', targetId: convId });
});
