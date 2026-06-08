// Typed application errors. The global error handler turns these into
// { error: { code, message } } with the right HTTP status.
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, code = 'bad_request'): AppError => new AppError(400, code, message);
export const unauthorized = (message = 'Not authenticated', code = 'unauthorized'): AppError => new AppError(401, code, message);
export const forbidden = (message = 'Forbidden', code = 'forbidden'): AppError => new AppError(403, code, message);
export const notFound = (message = 'Not found', code = 'not_found'): AppError => new AppError(404, code, message);
export const conflict = (message: string, code = 'conflict'): AppError => new AppError(409, code, message);
export const tooMany = (message = 'Too many requests', code = 'rate_limited'): AppError => new AppError(429, code, message);
