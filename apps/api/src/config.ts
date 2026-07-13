import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config as loadEnvironmentFile } from 'dotenv';
import { z } from 'zod';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
const bundledNativeLibrary = path.join(
  projectRoot,
  'native',
  'c2pa',
  'index.node',
);

if (!process.env.C2PA_LIBRARY_PATH && existsSync(bundledNativeLibrary)) {
  process.env.C2PA_LIBRARY_PATH = bundledNativeLibrary;
}

loadEnvironmentFile({
  path: path.join(projectRoot, '.env'),
  quiet: true,
});

const environmentSchema = z.object({
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  UPLOAD_LIMIT_MB: z.coerce.number().int().min(1).max(2048).default(2048),
  C2PA_CERT_PATH: z.string().min(1),
  C2PA_PRIVATE_KEY_PATH: z.string().min(1),
  C2PA_ALGORITHM: z
    .enum(['es256', 'es384', 'es512', 'ps256', 'ps384', 'ps512', 'ed25519'])
    .default('es256'),
  C2PA_TSA_URL: z.string().url().optional().or(z.literal('')),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(environment = process.env) {
  const parsed = environmentSchema.parse(environment);

  return {
    host: parsed.API_HOST,
    port: parsed.API_PORT,
    webOrigin: parsed.WEB_ORIGIN,
    uploadLimitBytes: parsed.UPLOAD_LIMIT_MB * 1024 * 1024,
    storageRoot: path.join(projectRoot, 'storage'),
    signer: {
      certificatePath: resolveProjectPath(parsed.C2PA_CERT_PATH),
      privateKeyPath: resolveProjectPath(parsed.C2PA_PRIVATE_KEY_PATH),
      algorithm: parsed.C2PA_ALGORITHM,
      ...(parsed.C2PA_TSA_URL ? { tsaUrl: parsed.C2PA_TSA_URL } : {}),
    },
  };
}

function resolveProjectPath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
}
