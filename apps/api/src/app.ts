import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  digitalSourceTypes,
  type ApiErrorResponse,
  type CreateJobResponse,
  type HealthResponse,
} from '@c2pa-demo/shared';
import type { AppConfig } from './config.js';
import { AppError } from './errors.js';
import { JobQueue } from './jobs/jobQueue.js';
import { JobRepository } from './jobs/jobRepository.js';
import { validateMediaFile } from './media.js';
import { FileStorage } from './storage/fileStorage.js';

interface AppDependencies {
  storage: FileStorage;
  repository: JobRepository;
  queue: Pick<JobQueue, 'enqueue'>;
}

const metadataSchema = z.object({
  title: z.string().trim().min(1).max(200),
  creator: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  digitalSourceType: z.enum(
    Object.keys(digitalSourceTypes) as [
      keyof typeof digitalSourceTypes,
      ...(keyof typeof digitalSourceTypes)[],
    ],
  ),
});

export async function buildApp(
  config: AppConfig,
  dependencies: AppDependencies,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      redact: [
        'req.headers.authorization',
        'request.headers.authorization',
        'certificate',
        'privateKey',
      ],
    },
    bodyLimit: config.uploadLimitBytes,
  });

  await app.register(cors, {
    origin: config.webOrigin,
    methods: ['GET', 'POST', 'DELETE'],
  });
  await app.register(multipart, {
    limits: {
      files: 1,
      fields: 4,
      parts: 5,
      fileSize: config.uploadLimitBytes,
    },
  });

  app.get<{ Reply: HealthResponse }>('/api/health', async () => ({
    status: 'ok',
    signerReady: true,
  }));

  app.post<{ Reply: CreateJobResponse | ApiErrorResponse }>(
    '/api/jobs',
    async (request, reply) => {
      const jobId = randomUUID();
      await dependencies.storage.createJobDirectory(jobId);

      try {
        const fields: Record<string, string> = {};
        let upload:
          | {
              inputPath: string;
              size: number;
              originalName: string;
              declaredMediaType: string;
            }
          | undefined;

        for await (const part of request.parts()) {
          if (part.type === 'file') {
            if (upload) {
              throw new AppError(
                400,
                'TOO_MANY_FILES',
                'アップロードできるファイルは 1 件です。',
              );
            }
            const stored = await dependencies.storage.saveUpload(
              jobId,
              part.file,
              config.uploadLimitBytes,
            );
            if (part.file.truncated) {
              throw new AppError(
                413,
                'UPLOAD_TOO_LARGE',
                'ファイルサイズが上限を超えています。',
              );
            }
            upload = {
              ...stored,
              originalName: part.filename,
              declaredMediaType: part.mimetype,
            };
          } else if (typeof part.value === 'string') {
            fields[part.fieldname] = part.value;
          }
        }

        if (!upload) {
          throw new AppError(
            400,
            'FILE_REQUIRED',
            '署名するメディアファイルを選択してください。',
          );
        }

        const metadata = metadataSchema.parse(fields);
        const mediaType = await validateMediaFile(
          upload.inputPath,
          upload.originalName,
          upload.declaredMediaType,
        );
        const inputPath = await dependencies.storage.finalizeInput(
          jobId,
          mediaType,
        );
        const outputPath = dependencies.storage.outputPath(jobId, mediaType);

        dependencies.repository.create({
          id: jobId,
          status: 'queued',
          metadata,
          media: {
            originalName: path.basename(upload.originalName),
            mediaType,
            size: upload.size,
          },
          inputPath,
          outputPath,
          createdAt: new Date().toISOString(),
        });
        dependencies.queue.enqueue(jobId);

        return reply.code(202).send({
          id: jobId,
          status: 'queued',
          statusUrl: `/api/jobs/${jobId}`,
        });
      } catch (error) {
        await dependencies.storage.deleteJob(jobId);
        throw error;
      }
    },
  );

  app.get<{ Params: { id: string } }>('/api/jobs/:id', async (request) => {
    const job = requireJob(dependencies.repository, request.params.id);
    return dependencies.repository.toResponse(job);
  });

  app.get<{ Params: { id: string } }>(
    '/api/jobs/:id/manifest',
    async (request) => {
      const job = requireCompletedJob(
        dependencies.repository,
        request.params.id,
      );
      return job.manifest;
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/jobs/:id/file',
    async (request, reply) => {
      const job = requireCompletedJob(
        dependencies.repository,
        request.params.id,
      );
      await dependencies.storage.assertFileExists(job.outputPath);
      const downloadName = `signed-${job.media.originalName}`;

      return reply
        .type(job.media.mediaType)
        .header(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        )
        .send(createReadStream(job.outputPath));
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/jobs/:id',
    async (request, reply) => {
      const job = requireJob(dependencies.repository, request.params.id);
      if (job.status === 'queued' || job.status === 'processing') {
        throw new AppError(
          409,
          'JOB_IN_PROGRESS',
          '処理中のジョブは削除できません。',
        );
      }
      await dependencies.storage.deleteJob(job.id);
      dependencies.repository.delete(job.id);
      return reply.code(204).send();
    },
  );

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed');

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_INPUT',
          message: '入力内容を確認してください。',
        },
      });
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'FST_REQ_FILE_TOO_LARGE'
    ) {
      return reply.code(413).send({
        error: {
          code: 'UPLOAD_TOO_LARGE',
          message: 'ファイルサイズが上限を超えています。',
        },
      });
    }

    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部でエラーが発生しました。',
      },
    });
  });

  return app;
}

function requireJob(repository: JobRepository, id: string) {
  const job = repository.get(id);
  if (!job) {
    throw new AppError(
      404,
      'JOB_NOT_FOUND',
      '指定されたジョブが見つかりません。',
    );
  }
  return job;
}

function requireCompletedJob(repository: JobRepository, id: string) {
  const job = requireJob(repository, id);
  if (job.status !== 'completed' || !job.manifest) {
    throw new AppError(
      409,
      'JOB_NOT_COMPLETED',
      '署名処理が完了していません。',
    );
  }
  return job;
}
