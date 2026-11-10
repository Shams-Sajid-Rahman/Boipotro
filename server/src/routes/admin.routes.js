import { Router } from 'express';
import { z } from 'zod';
import * as admin from '../services/admin.service.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParamSchema, optionalText } from '../validators/common.js';

// Every route below: logged in AND admin. Non-admins get 403.
const router = Router();
router.use(requireAuth, requireRole('admin'));

const byId = validate(idParamSchema, 'params');
const empty = (v) => (v === '' ? undefined : v);
const paging = {
  page: z.preprocess(empty, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(empty, z.coerce.number().int().min(1).max(100).default(20)),
};

const usersQuery = z.object({ q: optionalText(100), ...paging });
const listingsQuery = z.object({
  q: optionalText(100),
  status: z.preprocess(empty, z.enum(['active', 'reserved', 'sold', 'removed']).optional()),
  ...paging,
});
const reportsQuery = z.object({
  status: z.preprocess(empty, z.enum(['open', 'reviewing', 'resolved', 'dismissed']).optional()),
  ...paging,
});
const banSchema = z.object({ banned: z.boolean() });
const reportUpdateSchema = z.object({
  status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']),
  adminNote: optionalText(500),
});

router.get('/stats', asyncHandler(async (_req, res) => res.json({ stats: await admin.getStats() })));
router.get('/users', validate(usersQuery, 'query'), asyncHandler(async (req, res) => res.json(await admin.listUsers(req.validated.query))));
router.get('/listings', validate(listingsQuery, 'query'), asyncHandler(async (req, res) => res.json(await admin.listListings(req.validated.query))));
router.get('/reports', validate(reportsQuery, 'query'), asyncHandler(async (req, res) => res.json(await admin.listReports(req.validated.query))));

router.delete('/listings/:id', byId, asyncHandler(async (req, res) => {
  await admin.removeListing(req.validated.params.id);
  res.status(204).end();
}));
router.patch('/users/:id/ban', byId, validate(banSchema), asyncHandler(async (req, res) => {
  await admin.setUserBanned(req.validated.params.id, req.user.id, req.validated.body.banned);
  res.status(204).end();
}));
router.patch('/reports/:id', byId, validate(reportUpdateSchema), asyncHandler(async (req, res) => {
  await admin.updateReport(req.validated.params.id, req.user.id, req.validated.body);
  res.status(204).end();
}));

export default router;
