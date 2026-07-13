import { rm } from 'node:fs/promises';
import { errorMessage } from '../errors.js';
import type { C2paSigningService } from '../c2pa/signingService.js';
import { JobRepository } from './jobRepository.js';

export class JobQueue {
  private readonly pending: string[] = [];
  private running = false;

  constructor(
    private readonly repository: JobRepository,
    private readonly signingService: C2paSigningService,
  ) {}

  enqueue(jobId: string): void {
    this.pending.push(jobId);
    void this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.running) {
      return;
    }

    const jobId = this.pending.shift();
    if (!jobId) {
      return;
    }

    this.running = true;
    const startedAt = new Date().toISOString();
    const job = this.repository.update(jobId, {
      status: 'processing',
      startedAt,
    });

    try {
      const manifest = await this.signingService.sign({
        inputPath: job.inputPath,
        outputPath: job.outputPath,
        mediaType: job.media.mediaType,
        metadata: job.metadata,
      });
      this.repository.update(jobId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        manifest,
      });
    } catch (error) {
      await rm(job.outputPath, { force: true });
      this.repository.update(jobId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: sanitizeSigningError(error),
      });
    } finally {
      this.running = false;
      void this.processNext();
    }
  }
}

function sanitizeSigningError(error: unknown): string {
  const message = errorMessage(error);
  if (/certificate|private key|signer|credential/i.test(message)) {
    return 'C2PA 署名資格情報を確認してください。';
  }
  return 'C2PA 署名処理に失敗しました。';
}
