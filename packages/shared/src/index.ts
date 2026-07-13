export const jobStatuses = [
  'queued',
  'processing',
  'completed',
  'failed',
] as const;

export type JobStatus = (typeof jobStatuses)[number];

export const digitalSourceTypes = {
  digitalCapture:
    'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture',
  trainedAlgorithmicMedia:
    'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
  composite: 'http://cv.iptc.org/newscodes/digitalsourcetype/composite',
} as const;

export type DigitalSourceType = keyof typeof digitalSourceTypes;

export const supportedMediaFormats = [
  { mediaType: 'video/x-msvideo', extensions: ['.avi'], detectedExtensions: ['avi'], declaredMediaTypes: ['video/x-msvideo', 'video/vnd.avi', 'video/avi', 'video/msvideo', 'application/x-troff-msvideo'] },
  { mediaType: 'image/avif', extensions: ['.avif'], detectedExtensions: ['avif'], declaredMediaTypes: ['image/avif'] },
  { mediaType: 'image/x-adobe-dng', extensions: ['.dng'], detectedExtensions: ['dng'], declaredMediaTypes: ['image/x-adobe-dng', 'image/tiff'] },
  { mediaType: 'audio/flac', extensions: ['.flac'], detectedExtensions: ['flac'], declaredMediaTypes: ['audio/flac'] },
  { mediaType: 'image/gif', extensions: ['.gif'], detectedExtensions: ['gif'], declaredMediaTypes: ['image/gif'] },
  { mediaType: 'image/heic', extensions: ['.heic'], detectedExtensions: ['heic'], declaredMediaTypes: ['image/heic', 'image/heif'] },
  { mediaType: 'image/heif', extensions: ['.heif'], detectedExtensions: ['heic'], declaredMediaTypes: ['image/heif', 'image/heic'] },
  { mediaType: 'image/jpeg', extensions: ['.jpg', '.jpeg'], detectedExtensions: ['jpg'], declaredMediaTypes: ['image/jpeg'] },
  { mediaType: 'image/jxl', extensions: ['.jxl'], detectedExtensions: ['jxl'], declaredMediaTypes: ['image/jxl'] },
  { mediaType: 'audio/mp4', extensions: ['.m4a'], detectedExtensions: ['m4a'], declaredMediaTypes: ['audio/mp4', 'audio/x-m4a'] },
  { mediaType: 'audio/mpeg', extensions: ['.mp3'], detectedExtensions: ['mp3'], declaredMediaTypes: ['audio/mpeg'] },
  { mediaType: 'video/mp4', extensions: ['.mp4'], detectedExtensions: ['mp4'], declaredMediaTypes: ['video/mp4', 'application/mp4'] },
  { mediaType: 'video/quicktime', extensions: ['.mov'], detectedExtensions: ['mov'], declaredMediaTypes: ['video/quicktime'] },
  { mediaType: 'image/png', extensions: ['.png'], detectedExtensions: ['png'], declaredMediaTypes: ['image/png'] },
  { mediaType: 'image/svg+xml', extensions: ['.svg'], detectedExtensions: ['svg'], declaredMediaTypes: ['image/svg+xml'] },
  { mediaType: 'image/tiff', extensions: ['.tif', '.tiff'], detectedExtensions: ['tif'], declaredMediaTypes: ['image/tiff'] },
  { mediaType: 'audio/wav', extensions: ['.wav'], detectedExtensions: ['wav'], declaredMediaTypes: ['audio/wav', 'audio/x-wav'] },
  { mediaType: 'image/webp', extensions: ['.webp'], detectedExtensions: ['webp'], declaredMediaTypes: ['image/webp'] },
] as const;

export type SupportedMediaType = (typeof supportedMediaFormats)[number]['mediaType'];

export const supportedMediaExtensions = supportedMediaFormats.flatMap(
  (format) => format.extensions,
);

export const supportedMediaTypes = supportedMediaFormats.map(
  (format) => format.mediaType,
);

export interface CreateJobMetadata {
  title: string;
  creator: string;
  description: string;
  digitalSourceType: DigitalSourceType;
}

export interface MediaInfo {
  originalName: string;
  mediaType: SupportedMediaType;
  size: number;
}

export interface ManifestSummary {
  embedded: boolean;
  activeManifestLabel?: string;
  title?: string;
  claimGenerator?: string;
  signatureIssuer?: string;
  signatureTime?: string;
  validationStatus: unknown[];
  manifest: unknown;
}

export interface JobResponse {
  id: string;
  status: JobStatus;
  metadata: CreateJobMetadata;
  media: MediaInfo;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  manifest?: ManifestSummary;
  fileUrl?: string;
  manifestUrl?: string;
}

export interface CreateJobResponse {
  id: string;
  status: 'queued';
  statusUrl: string;
}

export interface HealthResponse {
  status: 'ok';
  signerReady: boolean;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
