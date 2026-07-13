import type {
  CreateJobMetadata,
  JobResponse,
  JobStatus,
  ManifestSummary,
  MediaInfo,
} from '@c2pa-demo/shared';

export interface SigningJob {
  id: string;
  status: JobStatus;
  metadata: CreateJobMetadata;
  media: MediaInfo;
  inputPath: string;
  outputPath: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  manifest?: ManifestSummary;
}

export class JobRepository {
  private readonly jobs = new Map<string, SigningJob>();

  create(job: SigningJob): void {
    this.jobs.set(job.id, job);
  }

  get(id: string): SigningJob | undefined {
    return this.jobs.get(id);
  }

  require(id: string): SigningJob {
    const job = this.get(id);
    if (!job) {
      const error = new Error('指定されたジョブが見つかりません。');
      error.name = 'JobNotFoundError';
      throw error;
    }
    return job;
  }

  update(id: string, update: Partial<SigningJob>): SigningJob {
    const current = this.require(id);
    const next = { ...current, ...update };
    this.jobs.set(id, next);
    return next;
  }

  delete(id: string): void {
    this.jobs.delete(id);
  }

  toResponse(job: SigningJob): JobResponse {
    return {
      id: job.id,
      status: job.status,
      metadata: job.metadata,
      media: job.media,
      createdAt: job.createdAt,
      ...(job.startedAt ? { startedAt: job.startedAt } : {}),
      ...(job.completedAt ? { completedAt: job.completedAt } : {}),
      ...(job.error ? { error: job.error } : {}),
      ...(job.manifest ? { manifest: job.manifest } : {}),
      ...(job.status === 'completed'
        ? {
            fileUrl: `/api/jobs/${job.id}/file`,
            manifestUrl: `/api/jobs/${job.id}/manifest`,
          }
        : {}),
    };
  }
}
