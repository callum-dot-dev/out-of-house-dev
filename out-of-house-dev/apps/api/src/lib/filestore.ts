// FileStore — driver interface with a `disk` driver (Render persistent disk at
// FILE_STORE_ROOT). An optional S3/R2 driver lands later, env-gated. All access
// is by logical key (e.g. "attachments/<uuid>/file.pdf"); traversal is blocked.
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { optional } from './env';

// Read lazily so tests (and runtime config) can set FILE_STORE_ROOT after import.
const rootDir = (): string => optional('FILE_STORE_ROOT', join(process.cwd(), '.data', 'files'));

function fullPath(key: string): string {
  const root = resolve(rootDir());
  const clean = normalize(key).replace(/^([/\\]|\.\.[/\\])+/, '');
  const full = resolve(root, clean);
  if (full !== root && !full.startsWith(root + sep)) {
    throw new Error('path traversal blocked');
  }
  return full;
}

export type FileStore = {
  put(key: string, data: Readable | Buffer): Promise<void>;
  read(key: string): Readable;
  exists(key: string): boolean;
  size(key: string): number;
  remove(key: string): Promise<void>;
  driver: string;
  root: string;
};

export const fileStore: FileStore = {
  driver: 'disk',
  get root() {
    return rootDir();
  },
  async put(key, data) {
    const full = fullPath(key);
    mkdirSync(dirname(full), { recursive: true });
    const source = Buffer.isBuffer(data) ? Readable.from(data) : data;
    await pipeline(source, createWriteStream(full));
  },
  read(key) {
    return createReadStream(fullPath(key));
  },
  exists(key) {
    return existsSync(fullPath(key));
  },
  size(key) {
    return statSync(fullPath(key)).size;
  },
  async remove(key) {
    const full = fullPath(key);
    if (existsSync(full)) await unlink(full);
  },
};
