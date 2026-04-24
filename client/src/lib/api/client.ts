import { env } from '@/config/env'
import { HttpError } from '@/lib/errors'

type QueryParams = Record<string, string | number | boolean | null | undefined>

export type ApiRequestConfig = Omit<RequestInit, 'body' | 'headers'> & {
  query?: QueryParams
  data?: unknown
  headers?: HeadersInit
  auth?: boolean
  token?: string
}

type ApiClientOptions = {
  baseUrl?: string
  defaultHeaders?: HeadersInit
}

const JSON_CONTENT_TYPE = 'application/json'

function appendQueryParams(url: URL, query?: QueryParams) {
  if (!query) return

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value))
    }
  })
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes(JSON_CONTENT_TYPE)) {
    return response.json()
  }

  return response.text() as unknown as T
}

async function resolveAuthToken(): Promise<string | null> {
  try {
    const { getSession } = await import('next-auth/react')
    const session = await getSession()

    return (session?.user as { token?: string })?.token || null
  } catch {
    return null
  }
}

async function handleError(response: Response) {
  let message = 'Unknown error'
  let details: unknown = undefined
  try {
    const contentType = response.headers.get('Content-Type') ?? ''
    if (contentType.includes(JSON_CONTENT_TYPE)) {
      const data = await response.json()
      message = data.message || JSON.stringify(data)
      details = data.details
    } else {
      message = await response.text()
    }
  } catch {
    // Ignore parse errors
  }

  if (typeof window !== 'undefined' && response.status === 401) {
    const errorCode =
      details && typeof details === 'object' && 'code' in (details as Record<string, unknown>)
        ? String((details as Record<string, unknown>).code ?? '')
        : ''
    const isExpiredToken =
      errorCode === 'TOKEN_EXPIRED' || /expired/i.test(message) || /invalid or expired/i.test(message)

    if (isExpiredToken) {
      const { forceLogout } = await import('@/lib/auth/session-cleanup')
      await forceLogout('expired')
    }
  }

  throw new HttpError(response.status, message, details)
}

export class ApiClient {
  private readonly baseUrl: string
  private readonly defaultHeaders: HeadersInit

  constructor(options: ApiClientOptions = {}) {
    const resolvedBaseUrl = options.baseUrl ?? env.NEXT_PUBLIC_API_BASE_URL

    if (!resolvedBaseUrl) {
      throw new Error('ApiClient base URL is not configured')
    }

    this.baseUrl = resolvedBaseUrl
    this.defaultHeaders = options.defaultHeaders ?? {}
  }

  private buildUrl(path: string, query?: QueryParams) {
    const url = /^https?:\/\//.test(path)
      ? new URL(path)
      : new URL(path, this.baseUrl)

    appendQueryParams(url, query)
    return url
  }

  private prepareBody(data: unknown, headers: Headers) {
    if (data === undefined || data === null) {
      return undefined
    }

    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return data
    }

    if (typeof data === 'string') {
      return data
    }

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', JSON_CONTENT_TYPE)
    }

    if (headers.get('Content-Type') === JSON_CONTENT_TYPE) {
      return JSON.stringify(data)
    }

    return data as BodyInit
  }

  async request<T>(path: string, config: ApiRequestConfig = {}) {
    const { query, data, headers, auth: requiresAuth = false, token, method, ...rest } = config

    const url = this.buildUrl(path, query)
    const requestHeaders = new Headers(this.defaultHeaders)

    if (headers) {
      new Headers(headers).forEach((value, key) => {
        requestHeaders.set(key, value)
      })
    }

    let resolvedToken = token
    if (requiresAuth && !resolvedToken) {
      resolvedToken = await resolveAuthToken() || undefined
    }

    if (resolvedToken) {
      requestHeaders.set('Authorization', `Bearer ${resolvedToken}`)
    }

    const body = this.prepareBody(data, requestHeaders)

    const init: RequestInit = {
      ...rest,
      method: method ?? 'GET',
      headers: requestHeaders,
    }

    if (body !== undefined) {
      init.body = body
    }

    const response = await fetch(url, init)

    if (!response.ok) {
      await handleError(response)
    }

    return parseResponse<T>(response)
  }

  get<T>(path: string, config?: Omit<ApiRequestConfig, 'method' | 'data'>) {
    return this.request<T>(path, {
      ...config,
      method: 'GET',
    })
  }

  post<T>(
    path: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'data'>
  ) {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      data,
    })
  }

  patch<T>(
    path: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'data'>
  ) {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      data,
    })
  }

  put<T>(
    path: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'data'>
  ) {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
      data,
    })
  }

  delete<T>(path: string, config?: Omit<ApiRequestConfig, 'method' | 'data'>) {
    return this.request<T>(path, {
      ...config,
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient({ baseUrl: env.NEXT_PUBLIC_API_BASE_URL })

export function apiFetch<T>(path: string, config?: ApiRequestConfig) {
  return apiClient.request<T>(path, config)
}
