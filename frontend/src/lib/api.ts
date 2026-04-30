type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, data: unknown) {
    super(typeof data === 'string' ? data : `Request failed with status ${status}`)
    this.status = status
    this.data = data
  }
}

function getCookie(name: string) {
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

async function ensureCsrfCookie() {
  if (getCookie('csrftoken')) {
    return
  }

  const response = await fetch('/api/auth/csrf/', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new ApiError(response.status, await readResponseData(response))
  }
}

function isUnsafeMethod(method: string) {
  return !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase())
}

async function readResponseData(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? await response.json() : await response.text()
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers = new Headers(options.headers)
  let body: BodyInit | undefined

  if (isUnsafeMethod(method)) {
    await ensureCsrfCookie()
    const csrfToken = getCookie('csrftoken')
    if (csrfToken) {
      headers.set('X-CSRFToken', csrfToken)
    }
  }

  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const response = await fetch(path, {
    ...options,
    method,
    headers,
    body,
    credentials: 'include',
  })

  if (response.status === 204) {
    return undefined as T
  }

  const data = await readResponseData(response)

  if (!response.ok) {
    throw new ApiError(response.status, data)
  }

  return data as T
}
