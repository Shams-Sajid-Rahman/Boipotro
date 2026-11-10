import { Router } from 'express';
import { z } from 'zod';
import * as catalog from '../services/catalog.service.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  subject: z.string().trim().min(3, 'Subject is required').max(150),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(3000),
});

router.get('/categories', asyncHandler(async (_req, res) => res.json({ data: await catalog.listCategories() })));
router.get('/universities', asyncHandler(async (_req, res) => res.json({ data: await catalog.listUniversities() })));
router.get('/site-content', asyncHandler(async (_req, res) => res.json({ data: await catalog.getSiteContent() })));
router.post(
  '/contact',
  writeLimiter,
  optionalAuth,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    await catalog.saveContactMessage(req.validated.body, req.user?.id);
    res.status(201).json({ ok: true });
  }),
);

export default router;
