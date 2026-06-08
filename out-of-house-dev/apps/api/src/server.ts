// API entrypoint: build the app, start the realtime (LISTEN/NOTIFY) bridge,
// then listen. The bridge needs the DB, so it runs here (not in buildApp).
import { buildApp } from './app';
import { startRealtimeBridge } from './lib/realtime';

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';

async function main(): Promise<void> {
  const app = await buildApp();
  try {
    await startRealtimeBridge();
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
