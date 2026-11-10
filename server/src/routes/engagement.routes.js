import { Router } from 'express';
import { z } from 'zod';
import * as offers from '../services/offer.service.js';
import * as engagement from '../services/engagement.service.js';
import * as conversations from '../services/conversation.service.js';
import { emitToUsers } from '../socket/index.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParamSchema } from '../validators/common.js';
import { updateOfferSchema, listingIdParamSchema } from '../validators/engagement.validators.js';

// Everything here requires login.
const router = Router();
// Scoped so unknown /api paths still 404 instead of 401.
router.use(['/offers', '/wishlist', '/conversations'], requireAuth);
const byId = validate(idParamSchema, 'params');

// ---------- Offers ----------
router.get('/offers/sent', asyncHandler(async (req, res) => res.json({ data: await offers.listSentOffers(req.user.id) })));
router.get('/offers/received', asyncHandler(async (req, res) => res.json({ data: await offers.listReceivedOffers(req.user.id) })));
router.patch(
  '/offers/:id', byId, validate(updateOfferSchema),
  asyncHandler(async (req, res) => {
    res.json({ offer: await offers.updateOfferStatus(req.validated.params.id, req.user.id, req.validated.body.status) });
  }),
);

// ---------- Wishlist ----------
const byListing = validate(listingIdParamSchema, 'params');
router.get('/wishlist', asyncHandler(async (req, res) => res.json({ data: await engagement.listWishlist(req.user.id) })));
router.post('/wishlist/:listingId', byListing, asyncHandler(async (req, res) => {
  await engagement.addToWishlist(req.user.id, req.validated.params.listingId);
  res.status(201).json({ ok: true });
}));
router.delete('/wishlist/:listingId', byListing, asyncHandler(async (req, res) => {
  await engagement.removeFromWishlist(req.user.id, req.validated.params.listingId);
  res.status(204).end();
}));

// ---------- Conversations ----------
const startSchema = z.object({ listingId: z.coerce.number().int().positive() });
const messagesQuery = z.object({
  before: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().positive().optional()),
  limit: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().min(1).max(100).default(30)),
});
const messageBody = z.object({ body: z.string().trim().min(1, 'Message cannot be empty').max(2000) });

router.get('/conversations', asyncHandler(async (req, res) => res.json({ data: await conversations.listConversations(req.user.id) })));
router.get('/conversations/unread-count', asyncHandler(async (req, res) => res.json({ unread: await conversations.getUnreadTotal(req.user.id) })));
router.post('/conversations', writeLimiter, validate(startSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ conversation: await conversations.startConversation(req.validated.body.listingId, req.user.id) });
}));
router.get('/conversations/:id', byId, asyncHandler(async (req, res) => {
  res.json({ conversation: await conversations.getConversation(req.validated.params.id, req.user.id) });
}));
router.get('/conversations/:id/messages', byId, validate(messagesQuery, 'query'), asyncHandler(async (req, res) => {
  res.json(await conversations.listMessages(req.validated.params.id, req.user.id, req.validated.query));
}));
// REST fallback for sending (the client normally uses the socket).
router.post('/conversations/:id/messages', byId, validate(messageBody), asyncHandler(async (req, res) => {
  const { message, participants } = await conversations.sendMessage(req.validated.params.id, req.user.id, req.validated.body.body);
  emitToUsers(participants, 'message:new', message);
  res.status(201).json({ message });
}));
router.post('/conversations/:id/read', byId, asyncHandler(async (req, res) => {
  const { participants } = await conversations.markRead(req.validated.params.id, req.user.id);
  emitToUsers(participants, 'conversation:read', { conversationId: req.validated.params.id, readerId: req.user.id });
  res.status(204).end();
}));

export default router;
