import { describe, expect, it } from 'vitest';
import { JobRepository } from '../src/jobs/jobRepository.js';

describe('JobRepository', () => {
  it('adds download URLs only after completion', () => {
    const repository = new JobRepository();
    repository.create({
      id: 'job-1',
      status: 'queued',
      metadata: {
        title: 'Sample',
        creator: 'Creator',
        description: 'Description',
        digitalSourceType: 'digitalCapture',
      },
      media: {
        originalName: 'sample.jpg',
        mediaType: 'image/jpeg',
        size: 10,
      },
      inputPath: 'input.jpg',
      outputPath: 'signed.jpg',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(repository.toResponse(repository.require('job-1')).fileUrl).toBe(
      undefined,
    );

    repository.update('job-1', {
      status: 'completed',
      manifest: {
        embedded: true,
        validationStatus: [],
        manifest: {},
      },
    });

    expect(repository.toResponse(repository.require('job-1')).fileUrl).toBe(
      '/api/jobs/job-1/file',
    );
  });
});
