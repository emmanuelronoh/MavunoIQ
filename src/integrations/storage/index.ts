import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getEnv } from '../../config/env.js';

export interface StorageProvider {
  name: string;
  isDemo: boolean;
  upload(buffer: Buffer, filename: string, contentType: string): Promise<{ url: string; key: string }>;
  delete(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  name = 'local';
  isDemo = false;
  constructor(private dir: string) {}

  async upload(buffer: Buffer, filename: string, _contentType: string) {
    await fs.mkdir(this.dir, { recursive: true });
    const ext = path.extname(filename);
    const key = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const fullPath = path.join(this.dir, key);
    await fs.writeFile(fullPath, buffer);
    return { url: `/uploads/${key}`, key };
  }

  async delete(key: string) {
    try {
      await fs.unlink(path.join(this.dir, key));
    } catch {
      /* ignore */
    }
  }
}

class DemoStorageProvider implements StorageProvider {
  name = 'demo';
  isDemo = true;
  async upload(_buffer: Buffer, filename: string, _contentType: string) {
    const key = `demo-${crypto.randomBytes(8).toString('hex')}-${filename}`;
    return { url: `https://demo-storage.local/${key}`, key };
  }
  async delete() {}
}

function createStorageProvider(): StorageProvider {
  const env = getEnv();
  const provider = (env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider === 'local') return new LocalStorageProvider(env.STORAGE_LOCAL_DIR);
  return new DemoStorageProvider();
}

export const storageProvider: StorageProvider = createStorageProvider();