// Lightweight API client with auth + error handling

export class ApiError extends Error {
  status: number
  data?: unknown
  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    credentials: 'same-origin',
  })
  let data: unknown = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && String((data as any).error)) ||
      `Ralat ${res.status}`
    throw new ApiError(message, res.status, data)
  }
  return data as T
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T = unknown>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
