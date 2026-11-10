import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const MAX_LISTING_IMAGES = 5;
const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export const LISTING_UPLOAD_DIR = path.resolve(env.UPLOAD_DIR, 'listings');
fs.mkdirSync(LISTING_UPLOAD_DIR, { recursive: true });

/** Public URL for a stored file, e.g. /uploads/listings/abc.jpg */
export const publicUrlFor = (filename) => `/uploads/listings/${filename}`;

/** Local path for a /uploads/listings/... URL, or null for external URLs (seed placeholders). */
export function localPathFor(url) {
  if (!url?.startsWith('/uploads/listings/')) return null;
  return path.join(LISTING_UPLOAD_DIR, path.basename(url));
}

export const removeFiles = (paths) =>
  Promise.all(paths.filter(Boolean).map((p) => fs.promises.unlink(p).catch(() => {})));

const storage = multer.diskStorage({
  destination: LISTING_UPLOAD_DIR,
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${MIME_EXT[file.mimetype]}`),
});

export const uploadListingImages = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: MAX_LISTING_IMAGES },
  fileFilter: (_req, file, cb) =>
    MIME_EXT[file.mimetype]
      ? cb(null, true)
      : cb(ApiError.badRequest('Only JPG, PNG or WEBP images are allowed')),
}).array('images', MAX_LISTING_IMAGES);

/** True if the file's first bytes really are JPEG / PNG / WEBP (the client's MIME type can lie). */
async function hasImageSignature(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const { buffer } = await handle.read(Buffer.alloc(12), 0, 12, 0);
    const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return jpeg || png || webp;
  } finally {
    await handle.close();
  }
}

/** Run after multer: rejects files whose contents are not real images. */
export async function verifyImageFiles(req, _res, next) {
  try {
    for (const file of req.files || []) {
      if (!(await hasImageSignature(file.path))) {
        return next(ApiError.badRequest(`"${file.originalname}" is not a valid JPG, PNG or WEBP image`));
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `Each image must be ${env.MAX_UPLOAD_MB} MB or smaller`,
  LIMIT_FILE_COUNT: `You can upload up to ${MAX_LISTING_IMAGES} images`,
  LIMIT_UNEXPECTED_FILE: `You can upload up to ${MAX_LISTING_IMAGES} images (field name "images")`,
};

export const multerErrorToApiError = (err) =>
  err instanceof multer.MulterError ? ApiError.badRequest(MULTER_MESSAGES[err.code] || err.message) : err;
