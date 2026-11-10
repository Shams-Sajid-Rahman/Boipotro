import { Router } from 'express';
import * as ctrl from '../controllers/listing.controller.js';
import * as offers from '../services/offer.service.js';
import * as engagement from '../services/engagement.service.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { uploadListingImages, verifyImageFiles } from '../middleware/upload.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParamSchema } from '../validators/common.js';
import {
  createListingSchema, updateListingSchema, statusSchema, listingQuerySchema, featuredQuerySchema,
} from '../validators/listing.validators.js';
import { createOfferSchema, reviewSchema, reportSchema } from '../validators/engagement.validators.js';

const router = Router();
const byId = validate(idParamSchema, 'params');

router.get('/', optionalAuth, validate(listingQuerySchema, 'query'), asyncHandler(ctrl.search));
// Must be registered before /:id.
router.get('/featured', optionalAuth, validate(featuredQuerySchema, 'query'), asyncHandler(ctrl.featured));
router.get('/:id', byId, optionalAuth, asyncHandler(ctrl.getById));

router.post('/', requireAuth, writeLimiter, uploadListingImages, verifyImageFiles, validate(createListingSchema), asyncHandler(ctrl.create));
router.patch('/:id', requireAuth, byId, uploadListingImages, verifyImageFiles, validate(updateListingSchema), asyncHandler(ctrl.update));
router.patch('/:id/status', requireAuth, byId, validate(statusSchema), asyncHandler(ctrl.updateStatus));
router.delete('/:id', requireAuth, byId, asyncHandler(ctrl.remove));

router.post(
  '/:id/offers',
  requireAuth, writeLimiter, byId, validate(createOfferSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ offer: await offers.createOffer(req.validated.params.id, req.user.id, req.validated.body) });
  }),
);

router.post(
  '/:id/reviews',
  requireAuth, byId, validate(reviewSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ review: await engagement.createReview(req.validated.params.id, req.user.id, req.validated.body) });
  }),
);

router.post(
  '/:id/reports',
  requireAuth, writeLimiter, byId, validate(reportSchema),
  asyncHandler(async (req, res) => {
    await engagement.createReport(req.validated.params.id, req.user.id, req.validated.body);
    res.status(201).json({ ok: true });
  }),
);

export default router;
