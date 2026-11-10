import { api, login, bearer, closePool, createListing, USERS, PASSWORD } from './helpers.js';

afterAll(closePool);

let student;
let admin;
beforeAll(async () => {
  student = await login(USERS.tanvir);
  admin = await login(USERS.admin);
});

describe('admin routes', () => {
  const adminGets = ['/api/admin/stats', '/api/admin/users', '/api/admin/listings', '/api/admin/reports'];

  test.each(adminGets)('%s is 401 anonymous, 403 for students, 200 for admins', async (path) => {
    expect((await api().get(path)).status).toBe(401);
    expect((await api().get(path).set(bearer(student.token))).status).toBe(403);
    expect((await api().get(path).set(bearer(admin.token))).status).toBe(200);
  });

  test('students cannot ban users, remove listings or close reports', async () => {
    expect((await api().patch('/api/admin/users/2/ban').set(bearer(student.token)).send({ banned: true })).status).toBe(403);
    expect((await api().delete('/api/admin/listings/1').set(bearer(student.token))).status).toBe(403);
    expect((await api().patch('/api/admin/reports/1').set(bearer(student.token)).send({ status: 'resolved' })).status).toBe(403);
  });

  test('report end to end: report -> admin removes listing -> closes report', async () => {
    const seller = await login(USERS.mehedi);
    const listing = await createListing(seller.token, { title: 'Suspicious Listing' });

    expect((await api().post(`/api/listings/${listing.id}/reports`).set(bearer(seller.token)).send({ reason: 'spam' })).status).toBe(400);
    const report = await api().post(`/api/listings/${listing.id}/reports`).set(bearer(student.token))
      .send({ reason: 'fake_or_misleading', details: 'Photos are from the internet' });
    expect(report.status).toBe(201);
    expect((await api().post(`/api/listings/${listing.id}/reports`).set(bearer(student.token)).send({ reason: 'spam' })).status).toBe(409);

    const open = await api().get('/api/admin/reports?status=open').set(bearer(admin.token));
    const mine = open.body.data.find((r) => r.listing.id === listing.id);
    expect(mine).toMatchObject({ reason: 'fake_or_misleading', reporter: { name: 'Tanvir Hasan' } });

    await api().delete(`/api/admin/listings/${listing.id}`).set(bearer(admin.token)).expect(204);
    await api().patch(`/api/admin/reports/${mine.id}`).set(bearer(admin.token)).send({ status: 'resolved', adminNote: 'Removed' }).expect(204);

    expect((await api().get(`/api/listings/${listing.id}`)).status).toBe(404);
    const resolved = await api().get('/api/admin/reports?status=resolved').set(bearer(admin.token));
    expect(resolved.body.data.find((r) => r.id === mine.id).resolvedAt).toBeTruthy();
  });

  test('banning blocks login and existing tokens immediately', async () => {
    const victim = await login(USERS.nusrat);
    await api().patch(`/api/admin/users/${victim.user.id}/ban`).set(bearer(admin.token)).send({ banned: true }).expect(204);

    expect((await api().get('/api/auth/me').set(bearer(victim.token))).status).toBe(403);
    expect((await api().post('/api/auth/refresh').set('Cookie', victim.cookie)).status).toBe(401);
    expect((await api().post('/api/auth/login').send({ email: USERS.nusrat, password: PASSWORD })).status).toBe(403);

    await api().patch(`/api/admin/users/${victim.user.id}/ban`).set(bearer(admin.token)).send({ banned: false }).expect(204);
    expect((await api().post('/api/auth/login').send({ email: USERS.nusrat, password: PASSWORD })).status).toBe(200);
  });

  test('admins cannot ban themselves', async () => {
    expect((await api().patch(`/api/admin/users/${admin.user.id}/ban`).set(bearer(admin.token)).send({ banned: true })).status).toBe(400);
  });
});

describe('conversations privacy', () => {
  test('only the two participants can read a conversation', async () => {
    const seller = await login(USERS.ayesha);
    const buyer = await login(USERS.mehedi);
    const outsider = await login(USERS.admin);
    const listing = await createListing(seller.token, { title: 'Chat Privacy Book' });

    expect((await api().post('/api/conversations').set(bearer(seller.token)).send({ listingId: listing.id })).status).toBe(400);
    const started = await api().post('/api/conversations').set(bearer(buyer.token)).send({ listingId: listing.id });
    expect(started.status).toBe(201);
    const again = await api().post('/api/conversations').set(bearer(buyer.token)).send({ listingId: listing.id });
    expect(again.body.conversation.id).toBe(started.body.conversation.id);

    const id = started.body.conversation.id;
    await api().post(`/api/conversations/${id}/messages`).set(bearer(buyer.token)).send({ body: 'Hi, still available?' }).expect(201);

    expect((await api().get(`/api/conversations/${id}/messages`).set(bearer(outsider.token))).status).toBe(404);
    expect((await api().post(`/api/conversations/${id}/messages`).set(bearer(outsider.token)).send({ body: 'x' })).status).toBe(404);

    const list = await api().get('/api/conversations').set(bearer(seller.token));
    const conv = list.body.data.find((c) => c.id === id);
    expect(conv).toMatchObject({ unreadCount: 1, role: 'seller', listing: { title: 'Chat Privacy Book' } });

    const msgs = await api().get(`/api/conversations/${id}/messages`).set(bearer(seller.token));
    expect(msgs.body.data.map((m) => m.body)).toEqual(['Hi, still available?']);

    await api().post(`/api/conversations/${id}/read`).set(bearer(seller.token)).expect(204);
    const unread = await api().get('/api/conversations/unread-count').set(bearer(seller.token));
    expect(unread.body.unread).toBe(1); // the seeded CLRS chat still has 1 unread
  });
});

test('unknown API routes are 404, not 401', async () => {
  expect((await api().get('/api/does-not-exist')).status).toBe(404);
});
