import { open } from 'node:fs/promises';
import path from 'node:path';
import {
  supportedMediaFormats,
  type SupportedMediaType,
} from '@c2pa-demo/shared';
import { fileTypeFromFile } from 'file-type';
import { AppError } from './errors.js';

export type { SupportedMediaType } from '@c2pa-demo/shared';

async function hasSvgRootElement(filePath: string): Promise<boolean> {
  const file = await open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(64 * 1024);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(
      buffer.subarray(0, bytesRead),
    );

    return /^(?:\uFEFF|\s|<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE\s+svg(?:\s[^>]*)?>)*<svg(?:\s|>)/i.test(
      text,
    );
  } catch {
    return false;
  } finally {
    await file.close();
  }
}

export async function validateMediaFile(
  filePath: string,
  originalName: string,
  declaredMediaType: string,
): Promise<SupportedMediaType> {
  const detected = await fileTypeFromFile(filePath);
  const extension = path.extname(originalName).toLowerCase();
  let detectedFormats = detected
    ? supportedMediaFormats.filter((candidate) =>
        (candidate.detectedExtensions as readonly string[]).includes(
          detected.ext,
        ),
      )
    : [];

  if (detectedFormats.length === 0 && (await hasSvgRootElement(filePath))) {
    detectedFormats = supportedMediaFormats.filter(
      (candidate) => candidate.mediaType === 'image/svg+xml',
    );
  }

  if (detectedFormats.length === 0) {
    throw new AppError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'C2PA 署名に対応したファイル形式を選択してください。',
    );
  }

  const format = detectedFormats.find((candidate) =>
    (candidate.extensions as readonly string[]).includes(extension),
  );

  if (!format) {
    throw new AppError(
      415,
      'MEDIA_EXTENSION_MISMATCH',
      'ファイルの内容と拡張子が一致していません。',
    );
  }

  if (
    declaredMediaType &&
    !(format.declaredMediaTypes as readonly string[]).some(
      (acceptedMediaType) => acceptedMediaType === declaredMediaType,
    )
  ) {
    throw new AppError(
      415,
      'MEDIA_TYPE_MISMATCH',
      'ブラウザが送信した形式とファイルの内容が一致していません。',
    );
  }

  return format.mediaType;
}

export function extensionFor(mediaType: SupportedMediaType): string {
  const format = supportedMediaFormats.find(
    (candidate) => candidate.mediaType === mediaType,
  );

  if (!format) {
    throw new Error(`Unsupported media type: ${mediaType}`);
  }

  return format.extensions[0];
}