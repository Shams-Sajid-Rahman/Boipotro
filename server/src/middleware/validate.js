import { ApiError } from '../utils/ApiError.js';

/**
 * Validate req[source] against a zod schema. The parsed value is stored on
 * req.validated[source]. Usage: router.post('/', validate(schema), handler)
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(ApiError.badRequest('Validation failed', details));
  }
  req.validated = { ...(req.validated || {}), [source]: result.data };
  next();
};
