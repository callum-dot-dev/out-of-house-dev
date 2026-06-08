import type { FastifyRequest } from 'fastify';
import { notFound } from './errors';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pull a route param that must be a UUID; 404 (not 500) on malformed input. */
export function uuidParam(req: FastifyRequest, key = 'id'): string {
  const v = (req.params as Record<string, string>)[key];
  if (!v || !UUID.test(v)) throw notFound();
  return v;
}

export const siteUrl = (): string => process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000';
