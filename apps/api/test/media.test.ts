import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateMediaFile } from '../src/media.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('validateMediaFile', () => {
  it('accepts a PNG whose content, extension, and MIME type agree', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'c2pa-media-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'image.png');
    await writeFile(
      filePath,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zf6UAAAAASUVORK5CYII=',
        'base64',
      ),
    );

    await expect(
      validateMediaFile(filePath, 'image.png', 'image/png'),
    ).resolves.toBe('image/png');
  });

  it('rejects an extension that does not match the detected content', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'c2pa-media-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'image.bin');
    await writeFile(
      filePath,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zf6UAAAAASUVORK5CYII=',
        'base64',
      ),
    );

    await expect(
      validateMediaFile(filePath, 'image.jpg', 'image/jpeg'),
    ).rejects.toMatchObject({ code: 'MEDIA_EXTENSION_MISMATCH' });
  });

  it('accepts an SVG detected from its root element', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'c2pa-media-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'image.svg');
    await writeFile(
      filePath,
      '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>',
    );

    await expect(
      validateMediaFile(filePath, 'image.svg', 'image/svg+xml'),
    ).resolves.toBe('image/svg+xml');
  });

  it('rejects non-SVG text with an SVG extension', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'c2pa-media-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'image.svg');
    await writeFile(filePath, '<html><body>not an SVG</body></html>');

    await expect(
      validateMediaFile(filePath, 'image.svg', 'image/svg+xml'),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  });

  it.each([
    {
      name: 'image.gif',
      mediaType: 'image/gif',
      contents: Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
        'base64',
      ),
    },
    {
      name: 'audio.wav',
      mediaType: 'audio/wav',
      contents: Buffer.from(
        '524946462400000057415645666d74201000000001000100401f0000803e0000020010006461746100000000',
        'hex',
      ),
    },
  ])('accepts C2PA-supported $mediaType content', async (sample) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'c2pa-media-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, sample.name);
    await writeFile(filePath, sample.contents);

    await expect(
      validateMediaFile(filePath, sample.name, sample.mediaType),
    ).resolves.toBe(sample.mediaType);
  });
});
