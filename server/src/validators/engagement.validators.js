import { z } from 'zod';
import { optionalText } from './common.js';

export const createOfferSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: 'Amount must be a number' }).positive('Offer must be greater than 0').max(100000),
  message: optionalText(500),
});

export const updateOfferSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'cancelled']),
});

export const listingIdParamSchema = z.object({ listingId: z.coerce.number().int().positive() });

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be 1 to 5').max(5, 'Rating must be 1 to 5'),
  comment: optionalText(1000),
});

export const REPORT_REASONS = ['spam', 'fake_or_misleading', 'prohibited_item', 'wrong_price', 'harassment', 'other'];

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS, { errorMap: () => ({ message: 'Choose a reason' }) }),
  details: optionalText(1000),
});
