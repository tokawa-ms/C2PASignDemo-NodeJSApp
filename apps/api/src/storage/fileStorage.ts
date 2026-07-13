import { createWriteStream } from 'node:fs';
import {
  access,
  mkdir,
  readdir,
  rm,
  stat,
} from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { AppError } from '../errors.js';
import { extensionFor, type SupportedMediaType } from '../media.js';

export interface StoredUpload {
  inputPath: string;
  size: number;
}

export class FileStorage {
  constructor(private readonly root: string) {}

  async initialize(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const entries = await readdir(this.root);
    await Promise.all(
      entries.map((entry) =>
        rm(path.join(this.root, entry), { recursive: true, force: true }),
      ),
    );
  }

  async createJobDirectory(jobId: string): Promise<string> {
    const directory = this.jobDirectory(jobId);
    await mkdir(directory, { recursive: false });
    return directory;
  }

  async saveUpload(
    jobId: string,
    stream: Readable,
    maximumBytes: number,
  ): Promise<StoredUpload> {
    const inputPath = path.join(this.jobDirectory(jobId), 'upload.bin');
    let size = 0;

    stream.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maximumBytes) {
        stream.destroy(
          new AppError(
            413,
            'UPLOAD_TOO_LARGE',
            `ファイルサイズは ${Math.floor(maximumBytes / 1024 / 1024)} MB 以下にしてください。`,
          ),
        );
      }
    });

    try {
      await pipeline(
        stream,
        createWriteStream(inputPath, { flags: 'wx' }),
      );
      return { inputPath, size };
    } catch (error) {
      await rm(inputPath, { force: true });
      throw error;
    }
  }

  async finalizeInput(
    jobId: string,
    mediaType: SupportedMediaType,
  ): Promise<string> {
    const currentPath = path.join(this.jobDirectory(jobId), 'upload.bin');
    const finalPath = path.join(
      this.jobDirectory(jobId),
      `input${extensionFor(mediaType)}`,
    );
    const { rename } = await import('node:fs/promises');
    await rename(currentPath, finalPath);
    return finalPath;
  }

  outputPath(jobId: string, mediaType: SupportedMediaType): string {
    return path.join(
      this.jobDirectory(jobId),
      `signed${extensionFor(mediaType)}`,
    );
  }

  async assertFileExists(filePath: string): Promise<void> {
    try {
      await access(filePath);
    } catch (error) {
      throw new AppError(
        404,
        'FILE_NOT_FOUND',
        '署名済みファイルが見つかりません。',
        { cause: error },
      );
    }
  }

  async fileSize(filePath: string): Promise<number> {
    return (await stat(filePath)).size;
  }

  async deleteJob(jobId: string): Promise<void> {
    await rm(this.jobDirectory(jobId), { recursive: true, force: true });
  }

  private jobDirectory(jobId: string): string {
    return path.join(this.root, jobId);
  }
}
