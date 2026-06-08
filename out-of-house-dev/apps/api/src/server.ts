// API entrypoint. Phase 0 ships the bootstrap + health check; later phases add
// auth, RBAC, files, SSE, webhooks and the domain routes onto `buildApp()`.
import { buildApp } from './app';

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';

async function main(): Promise<void> {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
