import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import type {
  CreateJobMetadata,
  DigitalSourceType,
  JobResponse,
} from '@c2pa-demo/shared'
import { supportedMediaFormats } from '@c2pa-demo/shared'
import { createJob, deleteJob, fileUrl, getJob } from './api/client'
import './App.css'

const maximumFileSize = 2048 * 1024 * 1024
const acceptedFileTypes = supportedMediaFormats
  .flatMap((format) => [
    ...format.extensions,
    ...format.declaredMediaTypes,
  ])
  .join(',')

function formatForFile(file: File) {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`

  return supportedMediaFormats.find(
    (format) =>
      (format.extensions as readonly string[]).includes(extension) &&
      (!file.type ||
        (format.declaredMediaTypes as readonly string[]).includes(file.type)),
  )
}

function App() {
  const [file, setFile] = useState<File>()
  const [metadata, setMetadata] = useState<CreateJobMetadata>({
    title: '',
    creator: '',
    description: '',
    digitalSourceType: 'digitalCapture',
  })
  const [job, setJob] = useState<JobResponse>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!job || (job.status !== 'queued' && job.status !== 'processing')) return

    const timer = window.setTimeout(async () => {
      try {
        setJob(await getJob(job.id))
      } catch (pollError) {
        setError(messageFrom(pollError))
      }
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [job])

  const canSubmit = useMemo(
    () =>
      Boolean(
        file &&
          metadata.title.trim() &&
          metadata.creator.trim() &&
          metadata.description.trim(),
      ),
    [file, metadata],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!file) {
      setError('署名するファイルを選択してください。')
      return
    }
    const selectedFormat = formatForFile(file)
    if (!selectedFormat) {
      setError('C2PA 署名に対応したファイル形式を選択してください。')
      return
    }
    if (file.size > maximumFileSize) {
      setError('ファイルサイズは 2,048 MB 以下にしてください。')
      return
    }

    setSubmitting(true)
    try {
      const created = await createJob(file, metadata)
      setJob({
        id: created.id,
        status: created.status,
        metadata,
        media: {
          originalName: file.name,
          mediaType: selectedFormat.mediaType,
          size: file.size,
        },
        createdAt: new Date().toISOString(),
      })
    } catch (submitError) {
      setError(messageFrom(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!job) return
    setError('')
    try {
      await deleteJob(job.id)
      setJob(undefined)
      setFile(undefined)
    } catch (deleteError) {
      setError(messageFrom(deleteError))
    }
  }

  function updateMetadata<Key extends keyof CreateJobMetadata>(
    key: Key,
    value: CreateJobMetadata[Key],
  ) {
    setMetadata((current) => ({ ...current, [key]: value }))
  }

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">CONTENT CREDENTIALS DEMO</p>
        <h1>メディアに C2PA 署名を付与</h1>
        <p>
          C2PA 対応メディアを登録し、来歴情報を埋め込んだ署名済みファイルを生成します。
        </p>
      </header>

      <section className="panel">
        <form onSubmit={handleSubmit}>
          <label className="file-drop">
            <span>{file ? file.name : 'メディアファイルを選択'}</span>
            <small>画像・音声・動画の C2PA 対応形式、最大 2,048 MB</small>
            <input
              type="file"
              accept={acceptedFileTypes}
              onChange={(event) => setFile(event.target.files?.[0])}
              disabled={submitting || job?.status === 'processing'}
            />
          </label>

          <div className="grid">
            <Field label="タイトル">
              <input
                value={metadata.title}
                maxLength={200}
                onChange={(event) => updateMetadata('title', event.target.value)}
                required
              />
            </Field>
            <Field label="作成者">
              <input
                value={metadata.creator}
                maxLength={200}
                onChange={(event) =>
                  updateMetadata('creator', event.target.value)
                }
                required
              />
            </Field>
          </div>

          <Field label="説明">
            <textarea
              value={metadata.description}
              maxLength={2000}
              rows={4}
              onChange={(event) =>
                updateMetadata('description', event.target.value)
              }
              required
            />
          </Field>

          <Field label="生成元">
            <select
              value={metadata.digitalSourceType}
              onChange={(event) =>
                updateMetadata(
                  'digitalSourceType',
                  event.target.value as DigitalSourceType,
                )
              }
            >
              <option value="digitalCapture">デジタル撮影</option>
              <option value="trainedAlgorithmicMedia">AI 生成</option>
              <option value="composite">合成コンテンツ</option>
            </select>
          </Field>

          <button className="primary" disabled={!canSubmit || submitting}>
            {submitting ? '登録中…' : 'C2PA 署名ジョブを開始'}
          </button>
        </form>
      </section>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {job && (
        <section className="panel result">
          <div className="result-heading">
            <div>
              <p className="eyebrow">JOB {job.id}</p>
              <h2>{statusLabel(job.status)}</h2>
            </div>
            <span className={`status status-${job.status}`}>{job.status}</span>
          </div>

          {job.status === 'failed' && (
            <>
              <p className="error">
                {job.error ?? '署名処理に失敗しました。'}
              </p>
              <button
                className="secondary"
                type="button"
                onClick={handleDelete}
              >
                ジョブを削除
              </button>
            </>
          )}

          {job.status === 'completed' && job.manifest && (
            <>
              <dl>
                <div>
                  <dt>埋め込み</dt>
                  <dd>{job.manifest.embedded ? '完了' : 'なし'}</dd>
                </div>
                <div>
                  <dt>マニフェスト</dt>
                  <dd>{job.manifest.activeManifestLabel ?? '取得済み'}</dd>
                </div>
                <div>
                  <dt>検証メッセージ</dt>
                  <dd>{job.manifest.validationStatus.length} 件</dd>
                </div>
              </dl>
              <details>
                <summary>マニフェスト JSON を表示</summary>
                <pre>{JSON.stringify(job.manifest.manifest, null, 2)}</pre>
              </details>
              <div className="actions">
                <a className="primary" href={fileUrl(job.id)}>
                  署名済みファイルを取得
                </a>
                <button
                  className="secondary"
                  type="button"
                  onClick={handleDelete}
                >
                  ジョブを削除
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <footer>
        ジョブ情報とファイルはサーバー再起動時に削除されます。秘密鍵はバックエンドだけで使用されます。
      </footer>
    </main>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function statusLabel(status: JobResponse['status']) {
  return {
    queued: '署名処理を待機しています',
    processing: 'C2PA 署名を処理しています',
    completed: '署名済みファイルを生成しました',
    failed: '署名処理に失敗しました',
  }[status]
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : '通信に失敗しました。'
}

export default App
