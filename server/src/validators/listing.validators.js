import { z } from 'zod';
import { optionalText, optionalId } from './common.js';

export const CONDITIONS = ['new', 'near_new', 'used', 'heavily_used'];
export const SORTS = ['newest', 'price_asc', 'price_desc', 'popular'];

const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

/** Strip hyphens/spaces; ISBN-10 check digit may be X. */
export const normalizeIsbn = (v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '').toUpperCase() : v);

const isbn = z.preprocess(
  (v) => normalizeIsbn(emptyToUndefined(v)),
  z.string().regex(/^(\d{9}[\dX]|\d{13})$/, 'ISBN must be 10 or 13 digits').optional(),
);
const price = z.coerce
  .number({ invalid_type_error: 'Price must be a number' })
  .positive('Price must be greater than 0')
  .max(100000, 'Price must be at most ৳100,000');

const listingFields = {
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  author: z.string().trim().min(2, 'Author must be at least 2 characters').max(200),
  isbn,
  edition: optionalText(50),
  categoryId: z.coerce.number({ invalid_type_error: 'Choose a category' }).int().positive('Choose a category'),
  universityId: optionalId,
  condition: z.enum(CONDITIONS, { errorMap: () => ({ message: 'Choose a valid condition' }) }),
  price,
  description: optionalText(2000),
};

// sellerId: only honoured for admins (post on behalf of a user); ignored otherwise.
export const createListingSchema = z.object({ ...listingFields, sellerId: optionalId });

/** IDs of images to delete; multipart sends one field per value or a comma list. */
const idList = z.preprocess((v) => {
  const raw = emptyToUndefined(v);
  if (raw === undefined) return [];
  return (Array.isArray(raw) ? raw : String(raw).split(',')).filter(Boolean);
}, z.array(z.coerce.number().int().positive()).max(20));

export const updateListingSchema = z
  .object(Object.fromEntries(Object.entries(listingFields).map(([k, s]) => [k, s.optional()])))
  .extend({ removeImageIds: idList });

export const statusSchema = z.object({
  status: z.enum(['active', 'reserved', 'sold']),
});

const conditionList = z.preprocess((v) => {
  const raw = emptyToUndefined(v);
  if (raw === undefined) return undefined;
  return (Array.isArray(raw) ? raw : String(raw).split(',')).filter(Boolean);
}, z.array(z.enum(CONDITIONS)).optional());

const optionalPrice = z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional());

export const listingQuerySchema = z
  .object({
    q: optionalText(100),
    // Category id or slug.
    category: optionalText(60),
    university: optionalId,
    condition: conditionList,
    minPrice: optionalPrice,
    maxPrice: optionalPrice,
    sort: z.preprocess(emptyToUndefined, z.enum(SORTS).default('newest')),
    page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
    limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).default(12)),
  })
  .refine((d) => d.minPrice === undefined || d.maxPrice === undefined || d.minPrice <= d.maxPrice, {
    message: 'minPrice must be less than or equal to maxPrice',
    path: ['minPrice'],
  });

export const featuredQuerySchema = z.object({
  by: z.preprocess(emptyToUndefined, z.enum(['popular', 'latest']).default('popular')),
  limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(10).default(10)),
});

export const myListingsQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(['active', 'reserved', 'sold']).optional()),
});
