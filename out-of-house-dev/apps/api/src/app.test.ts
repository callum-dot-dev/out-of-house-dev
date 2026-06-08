import { describe, it, expect } from 'vitest';
import { buildApp } from './app';

describe('api foundation', () => {
  it('GET /api/v1/health returns { ok: true }', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});
