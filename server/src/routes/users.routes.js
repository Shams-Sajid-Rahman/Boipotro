import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/listing.controller.js';
import * as engagement from '../services/engagement.service.js';
import { findUserById, updateProfile } from '../services/user.service.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParamSchema, optionalText, optionalId, optionalBdPhone } from '../validators/common.js';
import { myListingsQuerySchema } from '../validators/listing.validators.js';

const router = Router();

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  phone: optionalBdPhone,
  department: optionalText(100),
  universityId: optionalId,
});

router.get('/me/listings', requireAuth, validate(myListingsQuerySchema, 'query'), asyncHandler(ctrl.mine));

router.patch(
  '/me',
  requireAuth, validate(profileSchema),
  asyncHandler(async (req, res) => res.json({ user: await updateProfile(req.user.id, req.validated.body) })),
);

router.get(
  '/:id/reviews',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.validated.params.id);
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });
    res.json({ data: await engagement.listSellerReviews(user.id) });
  }),
);

export default router;
