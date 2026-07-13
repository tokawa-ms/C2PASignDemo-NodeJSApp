import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { C2paSigningService } from './c2pa/signingService.js';
import { JobQueue } from './jobs/jobQueue.js';
import { JobRepository } from './jobs/jobRepository.js';
import { FileStorage } from './storage/fileStorage.js';

const config = loadConfig();
const storage = new FileStorage(config.storageRoot);
await storage.initialize();

const signingService = await C2paSigningService.create(config.signer);
const repository = new JobRepository();
const queue = new JobQueue(repository, signingService);
const app = await buildApp(config, {
  storage,
  repository,
  queue,
});

await app.listen({ host: config.host, port: config.port });
