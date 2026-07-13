import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import {
  Builder,
  LocalSigner,
  Reader,
  type SigningAlg,
} from '@contentauth/c2pa-node';
import {
  digitalSourceTypes,
  type CreateJobMetadata,
  type ManifestSummary,
  type SupportedMediaType,
} from '@c2pa-demo/shared';
import { AppError } from '../errors.js';

interface SignerConfiguration {
  certificatePath: string;
  privateKeyPath: string;
  algorithm: SigningAlg;
  tsaUrl?: string;
}

interface SignRequest {
  inputPath: string;
  outputPath: string;
  mediaType: SupportedMediaType;
  metadata: CreateJobMetadata;
}

interface ManifestDefinition {
  claim_generator_info: Array<{ name: string; version: string }>;
  title: string;
  format: string;
  instance_id: string;
}

export class C2paSigningService {
  private constructor(private readonly signer: LocalSigner) {}

  static async create(
    configuration: SignerConfiguration,
  ): Promise<C2paSigningService> {
    const [certificate, privateKey] = await Promise.all([
      readFile(configuration.certificatePath),
      readFile(configuration.privateKeyPath),
    ]);

    const signer = LocalSigner.newSigner(
      certificate,
      privateKey,
      configuration.algorithm,
      configuration.tsaUrl,
    );
    return new C2paSigningService(signer);
  }

  async sign(request: SignRequest): Promise<ManifestSummary> {
    const manifestDefinition: ManifestDefinition = {
      claim_generator_info: [
        {
          name: 'C2PA Signing Demo',
          version: '0.1.0',
        },
      ],
      title: request.metadata.title,
      format: request.mediaType,
      instance_id: `xmp.iid:${randomUUID()}`,
    };

    const builder = Builder.withJson(manifestDefinition);
    builder.setIntent({
      create: digitalSourceTypes[request.metadata.digitalSourceType],
    });
    builder.addAssertion(
      'stds.schema-org.CreativeWork',
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        author: [
          {
            '@type': 'Person',
            name: request.metadata.creator,
          },
        ],
        description: request.metadata.description,
      }),
      'Json',
    );

    builder.sign(
      this.signer,
      { path: request.inputPath, mimeType: request.mediaType },
      { path: request.outputPath, mimeType: request.mediaType },
    );

    const reader = await Reader.fromAsset(
      { path: request.outputPath, mimeType: request.mediaType },
      {
        verify: {
          verify_after_reading: true,
          verify_trust: false,
        },
      },
    );

    if (!reader || !reader.isEmbedded() || !reader.getActive()) {
      throw new AppError(
        500,
        'C2PA_VERIFICATION_FAILED',
        '署名後の C2PA マニフェストを検証できませんでした。',
      );
    }

    return summarizeManifest(reader);
  }
}

function summarizeManifest(reader: Reader): ManifestSummary {
  const store = reader.json() as unknown;
  const active = reader.getActive() as unknown;
  const storeRecord = toRecord(store);
  const activeRecord = toRecord(active);
  const signatureInfo = toRecord(activeRecord?.signature_info);
  const claimGeneratorInfo = Array.isArray(activeRecord?.claim_generator_info)
    ? toRecord(activeRecord.claim_generator_info[0])
    : undefined;
  const activeManifestLabel = reader.activeLabel();

  return {
    embedded: reader.isEmbedded(),
    ...(activeManifestLabel ? { activeManifestLabel } : {}),
    ...(typeof activeRecord?.title === 'string'
      ? { title: activeRecord.title }
      : {}),
    ...(typeof claimGeneratorInfo?.name === 'string'
      ? { claimGenerator: claimGeneratorInfo.name }
      : {}),
    ...(typeof signatureInfo?.issuer === 'string'
      ? { signatureIssuer: signatureInfo.issuer }
      : {}),
    ...(typeof signatureInfo?.time === 'string'
      ? { signatureTime: signatureInfo.time }
      : {}),
    validationStatus: Array.isArray(storeRecord?.validation_status)
      ? storeRecord.validation_status
      : [],
    manifest: store,
  };
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}
