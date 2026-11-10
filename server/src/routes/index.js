import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import catalogRoutes from './catalog.routes.js';
import listingRoutes from './listings.routes.js';
import userRoutes from './users.routes.js';
import adminRoutes from './admin.routes.js';
import engagementRoutes from './engagement.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/', catalogRoutes); // /categories, /universities, /site-content, /contact
router.use('/', engagementRoutes); // /offers, /wishlist, /conversations (all require auth)

export default router;
