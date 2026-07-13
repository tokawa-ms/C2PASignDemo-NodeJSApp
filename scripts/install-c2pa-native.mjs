import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import unzipper from 'unzipper'

const releaseVersion = '0.5.5'
const assets = {
  'darwin-arm64': {
    target: 'aarch64-apple-darwin',
    sha256: '5d6873bf9071fdb7e38ce31b0bfa477073e653a0ad7b6c04d6c3aafdd823d47c',
  },
  'darwin-x64': {
    target: 'x86_64-apple-darwin',
    sha256: '7b1ac7e653a844d7cb8e2a6f33433e85ae88834c42a3852cedbee8947726d0e6',
  },
  'linux-arm64': {
    target: 'aarch64-unknown-linux-gnu',
    sha256: '68358ddfb39642ab84108dac9ec55451fdc7d66d78fbcea12bd8e5a71163ef49',
  },
  'linux-x64': {
    target: 'x86_64-unknown-linux-gnu',
    sha256: '8032012376745db22709e71cf076c1354920acee2e0440acd3137aa956a55e8f',
  },
  'win32-x64': {
    target: 'x86_64-pc-windows-msvc',
    sha256: '3bd1ee76822051c0b9296b5781239780922e6123aadd4f16f751531589f5a242',
  },
}

if (process.env.SKIP_C2PA_NATIVE_FALLBACK) process.exit(0)

const platformKey = `${process.platform}-${process.arch}`
const asset = assets[platformKey]
if (!asset) {
  throw new Error(`C2PA native fallback is unavailable for ${platformKey}`)
}

const destination = path.resolve('native', 'c2pa')
const binaryPath = path.join(destination, 'index.node')
const markerPath = path.join(destination, '.installed.json')
const marker = JSON.stringify({
  releaseVersion,
  platformKey,
  sha256: asset.sha256,
})

try {
  if ((await readFile(markerPath, 'utf8')) === marker) {
    await readFile(binaryPath)
    process.exit(0)
  }
} catch {
  // Download below when the marker or binary is absent.
}

const fileName = `c2pa-node_${asset.target}-v${releaseVersion}.zip`
const url =
  `https://github.com/contentauth/c2pa-node-v2/releases/download/` +
  `v${releaseVersion}/${fileName}`
const response = await fetch(url)
if (!response.ok) {
  throw new Error(`Failed to download C2PA native binary: HTTP ${response.status}`)
}

const archive = Buffer.from(await response.arrayBuffer())
const digest = createHash('sha256').update(archive).digest('hex')
if (digest !== asset.sha256) {
  throw new Error(`C2PA native archive checksum mismatch: ${digest}`)
}

const zip = await unzipper.Open.buffer(archive)
const binary = zip.files.find((entry) => entry.path.endsWith('index.node'))
if (!binary) {
  throw new Error('C2PA native archive does not contain index.node')
}

await mkdir(destination, { recursive: true })
await writeFile(binaryPath, await binary.buffer())
await writeFile(markerPath, marker, 'utf8')
console.log(`Installed verified C2PA native binary for ${platformKey}`)
