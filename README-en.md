# C2PA 署名 Web アプリ サンプル

> C2PA Signing Web Application Sample

[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=20232A)](https://react.dev/)
[![C2PA](https://img.shields.io/badge/C2PA-Content%20Credentials-1F6FEB)](https://c2pa.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

English | [日本語](./README.md)

This locally hosted web application sample adds Content Credentials to every format supported for writing by the C2PA SDK: AVI, AVIF, DNG, FLAC, GIF, HEIC, HEIF, JPEG, JPEG XL, M4A, MP3, MP4, MOV, PNG, SVG, TIFF, WAV, and WebP. The accepted extensions are `.avi`, `.avif`, `.dng`, `.flac`, `.gif`, `.heic`, `.heif`, `.jpg`, `.jpeg`, `.jxl`, `.m4a`, `.mp3`, `.mp4`, `.mov`, `.png`, `.svg`, `.tif`, `.tiff`, `.wav`, and `.webp`.

This list follows the file I/O write-support table for the native SDK bundled with the application (`c2pa-rs 0.82.1`). A format is not accepted merely because C2PA Technical Specification 2.4 defines an embedding method for it; the bundled SDK must also support writing it. PDF is read-only in this SDK, and `.c2pa` is an external manifest store rather than a media asset, so neither is accepted as a signing upload.

Users upload media from a browser, and the backend embeds a signed C2PA manifest. Signing is implemented with the official [`@contentauth/c2pa-node`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-node) package.

## Project structure

- `apps/web`: React/Vite frontend
- `apps/api`: Fastify API and asynchronous signing jobs
- `packages/shared`: TypeScript types shared by the API and UI
- `storage`: Temporary storage for uploaded and signed files
- `scripts/generate-dev-credentials.ps1`: Development certificate generator

Job metadata is kept in memory, while media files are stored on the local file system. Restarting the API removes previous jobs and files. Signing jobs are processed one at a time.

## Prerequisites

- Node.js 22 or later
- npm
- OpenSSL when generating development credentials
  - The script also detects OpenSSL bundled with Git for Windows.

`@contentauth/c2pa-node` obtains native binaries for Windows, macOS, and Linux during installation. Rust is not required unless you build the package from source.

The current `0.6.0` package is the migration release for the `c2pa-js` monorepo, but it does not publish platform-specific GitHub Release assets. This sample pins the JavaScript API to `0.6.0` while its `postinstall` script downloads the API-compatible official native binary from the preceding `0.5.5` release and verifies its published SHA-256 checksum. Once native assets are available for `0.6.x`, this compatibility step can be removed in favor of the package's standard binary.

## Setup

```powershell
npm install
Copy-Item .env.example .env
.\scripts\generate-dev-credentials.ps1
```

The credential generation script stops if credential files already exist to prevent accidental overwrites. To regenerate them, explicitly delete the `credentials` directory before running the script again.

## Running the application

```powershell
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:3001>
- Health check: <http://localhost:3001/api/health>

In the browser, select a file and enter its title, creator, description, and source type. The C2PA Digital Source Type can be set to digital capture, AI-generated media, or composite content.

### Verify the manifest in signed content

Load a signed content file downloaded from this application into [C2PA Viewer](https://c2paviewer.com/) to validate its embedded Content Credentials signature and inspect the C2PA manifest. According to C2PA Viewer, files are processed in the browser. Check the site for its currently supported file formats and size limits.

## Environment variables

| Variable                | Example default              | Description                      |
| ----------------------- | ---------------------------- | -------------------------------- |
| `API_HOST`              | `127.0.0.1`                  | API listen address               |
| `API_PORT`              | `3001`                       | API port                         |
| `WEB_ORIGIN`            | `http://localhost:5173`      | Web origin allowed by CORS       |
| `VITE_API_BASE_URL`     | `http://localhost:3001`      | API URL used by the web app      |
| `UPLOAD_LIMIT_MB`       | `2048`                       | Upload size limit                |
| `C2PA_CERT_PATH`        | `./credentials/dev-cert.pem` | Signing certificate chain        |
| `C2PA_PRIVATE_KEY_PATH` | `./credentials/dev-key.pem`  | PEM private key                  |
| `C2PA_ALGORITHM`        | `es256`                      | C2PA signing algorithm           |
| `C2PA_TSA_URL`          | Empty                        | Optional timestamp authority URL |

When using external credentials, specify a PEM certificate chain ordered from the leaf certificate upward and its corresponding private key. The certificate and private key are read only by the backend and are never uploaded through the API.

## Adobe reports an "unknown issuer"

The certificate generated by `scripts/generate-dev-credentials.ps1` is issued by a locally managed development CA that exists only within this repository. The cryptographic signature can be validated, but validators such as Adobe Content Authenticity do not trust this CA and therefore display a warning similar to:

> This Content Credential was issued by an unknown issuer.

To remove this warning in public user environments, **you must re-sign the media with a C2PA claim signing certificate whose chain leads to a CA on the C2PA Trust List**. A regular TLS/SSL certificate, a general-purpose code-signing certificate, or a self-signed certificate is not a substitute. Adding the development root certificate to your local Windows certificate store also does not change the C2PA Trust List used by Adobe's public validator.

### 1. Review the generator product conformance process

A conforming C2PA generator product must generate manifests that comply with the C2PA specification and sign claims with a valid X.509 certificate issued by a CA on the C2PA Trust List.

To issue trusted Content Credentials as a public service or product:

1. Review the [C2PA Conformance Program](https://c2pa.org/conformance/) requirements.
2. Apply through the [Expression of Interest form](https://docs.google.com/forms/d/e/1FAIpQLScERZH5rKfoeSu3y6gGbkllkyeAhmF0G-kXS0eXpb2vR238Rg/viewform).
3. Submit security documentation covering the product architecture, key generation and storage, signing process, and abuse prevention.
4. Coordinate the required assurance level, certificate profile, and issuance method with C2PA and your selected CA.

The conformance program and certificate issuance are separate processes. According to the official C2PA documentation, CAs on the Trust List issue claim signing certificates to conforming generator products. If you use this application only as a local evaluation sample and do not apply for conformance, the warning is expected to remain.

### 2. Obtain a certificate from a CA on the C2PA Trust List

Check **C2PA Trust List** in the [C2PA Conformance Explorer](https://spec.c2pa.org/conformance-explorer/) for the current issuers. Because the Trust List changes over time, treat the explorer rather than CA names copied into documentation as authoritative.

Confirm at least the following with the CA:

- The certificate is a **C2PA claim signing certificate**.
- It complies with the product's assurance level and the C2PA Certificate Policy.
- Its signing algorithm matches the application's `C2PA_ALGORITHM`.
- If Adobe should display an organization name, the certificate Subject includes `O` (Organization Name, OID `2.5.4.10`).
- You receive the intermediate certificates required to validate the chain up to a trust anchor on the Trust List, not only the leaf certificate.
- Whether the private key must be generated and retained in a KMS or HSM.

Purchasing a certificate alone does not automatically guarantee product conformance or a particular Adobe display result. Explain your intended use to both the CA and the C2PA Conformance Program before applying.

### 3. Prepare the certificate chain and private key

This sample's `LocalSigner` reads a PEM certificate chain and private key. If the CA supplies a PKCS#12 file (`.p12` or `.pfx`), convert it with OpenSSL:

```powershell
# Extract the private key in PKCS#8 format
openssl pkcs12 -in production.pfx -nocerts -nodes |
  openssl pkcs8 -topk8 -nocrypt -out production-key.pem

# Extract the leaf and CA certificates separately
openssl pkcs12 -in production.pfx -clcerts -nokeys -out leaf.pem
openssl pkcs12 -in production.pfx -cacerts -nokeys -chain -out ca-certificates.pem

# Build a signing chain with the leaf certificate first
Get-Content .\leaf.pem, .\ca-certificates.pem |
  Set-Content .\production-chain.pem -Encoding ascii
```

If the CA supplies separate files, concatenate them in this order: **leaf, immediate intermediate CA, then each higher intermediate CA**. The root CA is normally not embedded. If the PKCS#12 file includes the root CA, remove it from `ca-certificates.pem`. Follow the CA's instructions when they differ.

```powershell
Get-Content .\leaf.pem, .\intermediate-1.pem, .\intermediate-2.pem |
  Set-Content .\production-chain.pem -Encoding ascii
```

Before configuring the application, inspect the certificate Subject, Issuer, validity period, and extensions, and verify that the private key matches the leaf certificate:

```powershell
openssl x509 -in .\production-chain.pem -noout -subject -issuer -dates -text

openssl pkey -in .\production-key.pem -pubout -outform DER |
  openssl dgst -sha256

openssl x509 -in .\production-chain.pem -pubkey -noout |
  openssl pkey -pubin -outform DER |
  openssl dgst -sha256
```

The SHA-256 values produced by the final two commands must match.

### 4. Switch the application's signing credentials

Place the credentials in a secure location outside version control and update `.env`. The following example uses an ES256 certificate:

```dotenv
C2PA_CERT_PATH=C:\secure\c2pa\production-chain.pem
C2PA_PRIVATE_KEY_PATH=C:\secure\c2pa\production-key.pem
C2PA_ALGORITHM=es256
C2PA_TSA_URL=https://tsa.example.com/
```

Set `C2PA_ALGORITHM` to the value supported by the certificate and private key. Supported values are `es256`, `es384`, `es512`, `ps256`, `ps384`, `ps512`, and `ed25519`. For `C2PA_TSA_URL`, use a C2PA-compatible TSA specified by your CA or service provider.

Restart the API after changing the configuration, and sign a new file:

```powershell
npm run dev
```

You cannot replace only the certificate in a file that was already signed with the development certificate. Regenerate the signed file from the original media with the new credentials.

### 5. Verify with Adobe Content Authenticity

1. Download a file signed with the new credentials.
2. Upload it to [Adobe Content Authenticity Inspect](https://inspect.cr/).
3. Check the issuer, signing time, organization name, and validation status.
4. If the warning remains, inspect the manifest's `signature_info` and certificate chain, then ask the CA:
   - Does the issued certificate chain to the current C2PA Trust List?
   - Are all required intermediate certificates embedded in the signature?
   - Does the certificate satisfy the C2PA claim-signing profile and assurance level?
   - Is there a propagation delay before Adobe uses an updated Trust List?

### About timestamps

Issuer trust through the C2PA Trust List and signing-time trust through the C2PA TSA Trust List are separate. A TSA does not resolve the "unknown issuer" warning by itself. However, it supports long-term validation by proving that the signature was created while the signing certificate was valid, even after the certificate expires or is revoked. A production deployment should therefore use a TSA whose certificate chains to the [C2PA TSA Trust List](https://github.com/c2pa-org/conformance-public/blob/main/trust-list/C2PA-TSA-TRUST-LIST.pem).

### Official references

- [Getting a signing certificate](https://opensource.contentauthenticity.org/docs/signing/get-cert/)
- [C2PA trust lists](https://opensource.contentauthenticity.org/docs/conformance/trust-lists/)
- [C2PA Conformance Program](https://opensource.contentauthenticity.org/docs/conformance/)
- [Using a certificate in production](https://opensource.contentauthenticity.org/docs/signing/prod-cert/)
- [C2PA Certificate Policy](https://github.com/c2pa-org/conformance-public/blob/main/docs/current/C2PA%20Certificate%20Policy.pdf)

## API

| Method   | Path                     | Description                                        |
| -------- | ------------------------ | -------------------------------------------------- |
| `POST`   | `/api/jobs`              | Register media and metadata as multipart form data |
| `GET`    | `/api/jobs/:id`          | Get the current job status                         |
| `GET`    | `/api/jobs/:id/file`     | Download the signed media file                     |
| `GET`    | `/api/jobs/:id/manifest` | Get the validated manifest                         |
| `DELETE` | `/api/jobs/:id`          | Delete a completed or failed job                   |
| `GET`    | `/api/health`            | Get API and signing credential readiness           |

The multipart fields accepted by `POST /api/jobs` are `file`, `title`, `creator`, `description`, and `digitalSourceType`.

## Testing and building

```powershell
npm run typecheck
npm test
npm run build
```

## Limitations and security

- Credentials generated by the development script are for development only. They can demonstrate a valid cryptographic signature but are not trusted through the public C2PA Trust List.
- In production, do not keep a private key as a local file. Consider a KMS/HSM and `CallbackSigner`.
- Authentication, rate limiting, malware scanning, a persistent job database, a distributed queue, and cloud storage are not implemented.
- The 2 GB upload limit is intended for this localhost sample. Public deployments should apply a smaller limit and account for reverse-proxy limits, disk capacity, and timeouts.
- Inputs are rejected when their file content, extension, and MIME type do not agree.

## License

[MIT License](./LICENSE) © 2026 tokawa-ms
