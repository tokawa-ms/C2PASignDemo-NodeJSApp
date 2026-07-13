import type {
  ApiErrorResponse,
  CreateJobMetadata,
  CreateJobResponse,
  JobResponse,
} from '@c2pa-demo/shared'

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:3001'

export async function createJob(
  file: File,
  metadata: CreateJobMetadata,
): Promise<CreateJobResponse> {
  const body = new FormData()
  body.append('file', file)
  body.append('title', metadata.title)
  body.append('creator', metadata.creator)
  body.append('description', metadata.description)
  body.append('digitalSourceType', metadata.digitalSourceType)

  return request<CreateJobResponse>('/api/jobs', {
    method: 'POST',
    body,
  })
}

export function getJob(id: string): Promise<JobResponse> {
  return request<JobResponse>(`/api/jobs/${id}`)
}

export async function deleteJob(id: string): Promise<void> {
  await request<void>(`/api/jobs/${id}`, { method: 'DELETE' })
}

export function fileUrl(id: string): string {
  return `${apiBaseUrl}/api/jobs/${id}/file`
}

async function request<Response>(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`${apiBaseUrl}${path}`, init)
  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => undefined)) as ApiErrorResponse | undefined
    throw new Error(payload?.error.message ?? `HTTP ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as Response
  }
  return (await response.json()) as Response
}
