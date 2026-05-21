import fs from 'node:fs';
import path from 'node:path';
import { env } from './env';

export function ensureUploadDir() {
  const dir = path.resolve(env.UPLOAD_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
