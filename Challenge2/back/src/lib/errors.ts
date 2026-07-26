import content from '../content/es.json' with { type: 'json' };

const { errors } = content;

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = (message = errors.unauthorized) => new AppError(401, message);
export const forbidden = (message = errors.forbidden) => new AppError(403, message);
export const notFound = (message = errors.notFound) => new AppError(404, message);
export const unprocessable = (message: string) => new AppError(422, message);
