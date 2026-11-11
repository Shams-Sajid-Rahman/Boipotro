import { Router } from 'express';
import { z } from 'zod';
import * as admin from '../services/admin.service.js';
import * as manage from '../services/adminManage.service.js';
import { updateListingStatus } from '../services/listing.service.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParamSchema, optionalText, optionalId, optionalBdPhone } from '../validators/common.js';

// Every route below: logged in AND admin. Non-admins get 403.
const router = Router();
router.use(requireAuth, requireRole('admin'));

const byId = validate(idParamSchema, 'params');
const empty = (v) => (v === '' ? undefined : v);
const paging = {
  page: z.preprocess(empty, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(empty, z.coerce.number().int().min(1).max(100).default(20)),
};
const daysQuery = z.object({ days: z.preprocess(empty, z.coerce.number().int().min(7).max(365).default(30)) });

/** Wraps a handler and records the action in the audit log afterwards. */
const audited = (action, targetType, handler, details = () => null) =>
  asyncHandler(async (req, res) => {
    await handler(req, res);
    await manage.logAction(req.user.id, action, targetType, req.validated?.params?.id ?? null, details(req));
  });

// ---------- Overview ----------
router.get('/stats', asyncHandler(async (_req, res) => res.json({ stats: await admin.getStats() })));
router.get('/sales', validate(daysQuery, 'query'), asyncHandler(async (req, res) => res.json(await manage.getSalesReport(req.validated.query))));
router.get('/audit', validate(z.object(paging), 'query'), asyncHandler(async (req, res) => res.json(await manage.listAudit(req.validated.query))));

// ---------- Users ----------
const password = z.string().min(8, 'Password must be at least 8 characters').max(72)
  .regex(/[A-Za-z]/, 'Password must contain a letter').regex(/\d/, 'Password must contain a number');
const nullable = (schema) => z.preprocess((v) => (v === '' ? null : v), schema.nullable().optional());

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password,
  phone: optionalBdPhone,
  universityId: optionalId,
  department: optionalText(100),
  role: z.enum(['student', 'admin']).default('student'),
  isVerified: z.boolean().default(false),
});
const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email').optional(),
  password: z.preprocess(empty, password.optional()),
  phone: nullable(z.string().trim().regex(/^\+8801[3-9]\d{8}$/, 'Use the format +8801XXXXXXXXX')),
  universityId: nullable(z.coerce.number().int().positive()),
  department: nullable(z.string().trim().max(100)),
  role: z.enum(['student', 'admin']).optional(),
  isVerified: z.boolean().optional(),
});

router.get('/users', validate(z.object({ q: optionalText(100), ...paging }), 'query'), asyncHandler(async (req, res) => res.json(await admin.listUsers(req.validated.query))));
router.get('/users/:id', byId, asyncHandler(async (req, res) => res.json({ user: await manage.getUserDetail(req.validated.params.id) })));
router.post('/users', validate(createUserSchema), asyncHandler(async (req, res) => {
  const user = await manage.createUser(req.validated.body);
  await manage.logAction(req.user.id, 'create_user', 'user', user.id, { email: user.email, role: user.role });
  res.status(201).json({ user });
}));
router.patch('/users/:id', byId, validate(updateUserSchema), audited('update_user', 'user', async (req, res) => {
  res.json({ user: await manage.updateUser(req.validated.params.id, req.user.id, req.validated.body) });
}, (req) => ({ fields: Object.keys(req.validated.body).filter((k) => k !== 'password'), passwordChanged: Boolean(req.validated.body.password) })));
router.delete('/users/:id', byId, audited('delete_user', 'user', async (req, res) => {
  await manage.deleteUser(req.validated.params.id, req.user.id);
  res.status(204).end();
}));
router.patch('/users/:id/ban', byId, validate(z.object({ banned: z.boolean() })), audited('ban_user', 'user', async (req, res) => {
  await admin.setUserBanned(req.validated.params.id, req.user.id, req.validated.body.banned);
  res.status(204).end();
}, (req) => ({ banned: req.validated.body.banned })));

// ---------- Listings ----------
const listingsQuery = z.object({
  q: optionalText(100),
  status: z.preprocess(empty, z.enum(['active', 'reserved', 'sold', 'removed']).optional()),
  ...paging,
});
router.get('/listings', validate(listingsQuery, 'query'), asyncHandler(async (req, res) => res.json(await admin.listListings(req.validated.query))));
router.delete('/listings/:id', byId, audited('remove_listing', 'listing', async (req, res) => {
  await admin.removeListing(req.validated.params.id);
  res.status(204).end();
}));
router.post('/listings/:id/restore', byId, audited('restore_listing', 'listing', async (req, res) => {
  await manage.restoreListing(req.validated.params.id);
  res.status(204).end();
}));
router.delete('/listings/:id/permanent', byId, audited('delete_listing_permanently', 'listing', async (req, res) => {
  await manage.hardDeleteListing(req.validated.params.id);
  res.status(204).end();
}));
router.patch('/listings/:id/status', byId, validate(z.object({ status: z.enum(['active', 'reserved', 'sold']) })), audited('set_listing_status', 'listing', async (req, res) => {
  res.json({ listing: await updateListingStatus(req.validated.params.id, req.user, req.validated.body.status) });
}, (req) => ({ status: req.validated.body.status })));

// ---------- Reports ----------
const reportsQuery = z.object({
  status: z.preprocess(empty, z.enum(['open', 'reviewing', 'resolved', 'dismissed']).optional()),
  ...paging,
});
router.get('/reports', validate(reportsQuery, 'query'), asyncHandler(async (req, res) => res.json(await admin.listReports(req.validated.query))));
router.patch('/reports/:id', byId, validate(z.object({ status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']), adminNote: optionalText(500) })),
  audited('update_report', 'report', async (req, res) => {
    await admin.updateReport(req.validated.params.id, req.user.id, req.validated.body);
    res.status(204).end();
  }, (req) => ({ status: req.validated.body.status })));

// ---------- Categories & universities ----------
const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes');
const categorySchema = z.object({ name: z.string().trim().min(2).max(60), slug: z.preprocess(empty, slug.optional()) });
const universitySchema = z.object({
  name: z.string().trim().min(3).max(150),
  emailDomain: z.preprocess(empty, z.string().trim().toLowerCase().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, 'e.g. northsouth.edu').optional()),
  city: z.string().trim().min(2).max(60),
});

router.post('/categories', validate(categorySchema), asyncHandler(async (req, res) => {
  const category = await manage.createCategory(req.validated.body);
  await manage.logAction(req.user.id, 'create_category', 'category', category.id, { name: category.name });
  res.status(201).json({ category });
}));
router.patch('/categories/:id', byId, validate(categorySchema.partial()), audited('update_category', 'category', async (req, res) => {
  res.json({ category: await manage.updateCategory(req.validated.params.id, req.validated.body) });
}));
router.delete('/categories/:id', byId, audited('delete_category', 'category', async (req, res) => {
  await manage.deleteCategory(req.validated.params.id);
  res.status(204).end();
}));
router.post('/universities', validate(universitySchema), asyncHandler(async (req, res) => {
  const uni = await manage.createUniversity(req.validated.body);
  await manage.logAction(req.user.id, 'create_university', 'university', uni.id, { name: req.validated.body.name });
  res.status(201).json({ university: uni });
}));
router.patch('/universities/:id', byId, validate(universitySchema.partial()), audited('update_university', 'university', async (req, res) => {
  await manage.updateUniversity(req.validated.params.id, req.validated.body);
  res.status(204).end();
}));
router.delete('/universities/:id', byId, audited('delete_university', 'university', async (req, res) => {
  await manage.deleteUniversity(req.validated.params.id);
  res.status(204).end();
}));

// ---------- Site content & fees ----------
const contentKeyParams = z.object({ key: z.enum(['hero', 'featured', 'howItWorks', 'messaging', 'trust', 'footer', 'about', 'contact', 'fees']) });
const feesSchema = z.object({ commissionPercent: z.coerce.number().min(0, 'Min 0%').max(50, 'Max 50%') });

router.put('/site-content/:key', validate(contentKeyParams, 'params'), validate(z.object({ value: z.record(z.any()) })), asyncHandler(async (req, res) => {
  const { key } = req.validated.params;
  let { value } = req.validated.body;
  if (key === 'fees') {
    const parsed = feesSchema.safeParse(value);
    if (!parsed.success) return res.status(400).json({ error: { message: parsed.error.issues[0].message } });
    value = parsed.data;
  }
  await manage.updateSiteContent(key, value);
  await manage.logAction(req.user.id, 'update_site_content', 'site_content', null, { key, ...(key === 'fees' ? value : {}) });
  res.status(204).end();
}));

// ---------- Chat activity (read-only; every transcript view is audited) ----------
router.get('/chats/stats', validate(daysQuery, 'query'), asyncHandler(async (req, res) => res.json(await manage.getChatStats(req.validated.query))));
router.get('/chats', validate(z.object({ q: optionalText(100), ...paging }), 'query'), asyncHandler(async (req, res) => res.json(await manage.listConversations(req.validated.query))));
router.get('/chats/:id', byId, audited('view_conversation', 'conversation', async (req, res) => {
  res.json({ conversation: await manage.getConversationTranscript(req.validated.params.id) });
}));

export default router;
