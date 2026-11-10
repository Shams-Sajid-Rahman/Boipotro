import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';
import { multerErrorToApiError, removeFiles } from './upload.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Express recognises error middleware by its 4 arguments, so `_next` must stay.
// eslint-disable-next-line no-unused-vars
export function errorHandler(rawErr, req, res, _next) {
  const err = multerErrorToApiError(rawErr);
  // A failed request must not leave orphaned uploads on disk.
  if (req.files?.length) removeFiles(req.files.map((f) => f.path));

  // Malformed JSON body.
  const status = err.type === 'entity.parse.failed' ? 400 : err instanceof ApiError ? err.status : err.status || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    error: {
      message: status >= 500 && isProd ? 'Internal server error' : err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}
