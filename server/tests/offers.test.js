import { api, login, bearer, closePool, createListing, USERS } from './helpers.js';

afterAll(closePool);

let seller;
let buyer;
let other;
beforeAll(async () => {
  seller = await login(USERS.tanvir);
  buyer = await login(USERS.nusrat);
  other = await login(USERS.mehedi);
});

const offer = (token, listingId, body) => api().post(`/api/listings/${listingId}/offers`).set(bearer(token)).send(body);
const setOffer = (token, id, status) => api().patch(`/api/offers/${id}`).set(bearer(token)).send({ status });

test('a seller cannot offer on their own listing', async () => {
  const listing = await createListing(seller.token);
  expect((await offer(seller.token, listing.id, { amount: 400 })).status).toBe(400);
});

test('only one pending offer per buyer per listing; buyer can cancel', async () => {
  const listing = await createListing(seller.token);
  const first = await offer(buyer.token, listing.id, { amount: 400 });
  expect(first.status).toBe(201);
  expect((await offer(buyer.token, listing.id, { amount: 450 })).status).toBe(409);

  expect((await setOffer(buyer.token, first.body.offer.id, 'accepted')).status).toBe(403);
  expect((await setOffer(other.token, first.body.offer.id, 'rejected')).status).toBe(404);
  const cancelled = await setOffer(buyer.token, first.body.offer.id, 'cancelled');
  expect(cancelled.body.offer.status).toBe('cancelled');
});

test('full flow: offer -> accept (reserved) -> sold -> buyer reviews once', async () => {
  const listing = await createListing(seller.token, { price: '800' });
  const mine = await offer(buyer.token, listing.id, { amount: 700, message: 'Can meet at NSU library' });
  const competing = await offer(other.token, listing.id, { amount: 650 });

  const received = await api().get('/api/offers/received').set(bearer(seller.token));
  expect(received.body.data.map((o) => o.id)).toEqual(expect.arrayContaining([mine.body.offer.id, competing.body.offer.id]));
  const sent = await api().get('/api/offers/sent').set(bearer(buyer.token));
  expect(sent.body.data.map((o) => o.id)).toContain(mine.body.offer.id);

  const accepted = await setOffer(seller.token, mine.body.offer.id, 'accepted');
  expect(accepted.status).toBe(200);
  expect(accepted.body.offer.listing.status).toBe('reserved');

  // The competing offer was auto-rejected.
  const otherSent = await api().get('/api/offers/sent').set(bearer(other.token));
  expect(otherSent.body.data.find((o) => o.id === competing.body.offer.id).status).toBe('rejected');

  // Can't review before the sale is completed.
  const early = await api().post(`/api/listings/${listing.id}/reviews`).set(bearer(buyer.token)).send({ rating: 5 });
  expect(early.status).toBe(403);

  await api().patch(`/api/listings/${listing.id}/status`).set(bearer(seller.token)).send({ status: 'sold' }).expect(200);

  const details = await api().get(`/api/listings/${listing.id}`).set(bearer(buyer.token));
  expect(details.body.listing.viewer.canReview).toBe(true);

  expect((await api().post(`/api/listings/${listing.id}/reviews`).set(bearer(other.token)).send({ rating: 1 })).status).toBe(403);
  expect((await api().post(`/api/listings/${listing.id}/reviews`).set(bearer(buyer.token)).send({ rating: 6 })).status).toBe(400);
  const review = await api().post(`/api/listings/${listing.id}/reviews`).set(bearer(buyer.token)).send({ rating: 4, comment: 'Smooth deal' });
  expect(review.status).toBe(201);
  expect((await api().post(`/api/listings/${listing.id}/reviews`).set(bearer(buyer.token)).send({ rating: 5 })).status).toBe(409);

  const after = await api().get(`/api/listings/${listing.id}`);
  expect(after.body.listing.seller.reviewCount).toBeGreaterThanOrEqual(1);
  expect(after.body.listing.seller.ratingAvg).toEqual(expect.any(Number));
});

test('wishlist add / list / remove, reflected on cards', async () => {
  const listing = await createListing(seller.token, { title: 'Wishlist Test Book' });
  await api().post(`/api/wishlist/${listing.id}`).set(bearer(buyer.token)).expect(201);
  await api().post(`/api/wishlist/${listing.id}`).set(bearer(buyer.token)).expect(201); // idempotent

  const list = await api().get('/api/wishlist').set(bearer(buyer.token));
  expect(list.body.data.map((l) => l.id)).toContain(listing.id);

  const search = await api().get('/api/listings?q=Wishlist Test Book').set(bearer(buyer.token));
  expect(search.body.data[0].isWishlisted).toBe(true);

  await api().delete(`/api/wishlist/${listing.id}`).set(bearer(buyer.token)).expect(204);
  const after = await api().get('/api/wishlist').set(bearer(buyer.token));
  expect(after.body.data.map((l) => l.id)).not.toContain(listing.id);
});
