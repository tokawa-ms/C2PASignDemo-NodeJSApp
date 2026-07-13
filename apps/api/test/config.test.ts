import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('loadConfig', () => {
  it('keeps temporary storage inside the project', () => {
    const config = loadConfig({
      C2PA_CERT_PATH: './credentials/dev-cert.pem',
      C2PA_PRIVATE_KEY_PATH: './credentials/dev-key.pem',
      STORAGE_ROOT: path.parse(projectRoot).root,
    });

    expect(config.storageRoot).toBe(path.join(projectRoot, 'storage'));
  });
});