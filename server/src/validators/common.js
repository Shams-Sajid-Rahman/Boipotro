import { z } from 'zod';

/** Treat '' / null (common from forms and multipart) as "not provided". */
const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

export const optionalText = (max) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const optionalId = z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional());

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

/** Accepts 01XXXXXXXXX, 8801XXXXXXXXX or +8801XXXXXXXXX; returns +8801XXXXXXXXX. */
export const optionalBdPhone = z.preprocess(
  (v) => {
    const raw = emptyToUndefined(v);
    if (typeof raw !== 'string') return raw;
    const digits = raw.replace(/[\s-]/g, '');
    if (/^01\d{9}$/.test(digits)) return `+88${digits}`;
    if (/^8801\d{9}$/.test(digits)) return `+${digits}`;
    return digits;
  },
  z.string().regex(/^\+8801[3-9]\d{8}$/, 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX)').optional(),
);
