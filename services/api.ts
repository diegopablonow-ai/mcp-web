import { API_BASE_URL } from "@/lib/constants"

// -----------------------------------------------------------------------------
// Typed API client — cookie-based auth edition.
//
// Tokens live exclusively in httpOnly, Secure, SameSite=Strict cookies managed
// by the /api/auth/* Route Handlers. This file never reads or writes tokens
// directly, eliminating the XSS localStorage exposure.
//
// The 401 interceptor calls /api/auth/refresh (which rotates the httpOnly
// cookie server-side) before retrying the original request.
// -----------------------------------------------------------------------------

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  /** When false, skips credentials (unauthenticated routes like /auth/login). */
  auth?: boolean
  /** Internal — prevents infinite refresh loops. */
  _retried?: boolean
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, _retried = false, ...rest } = options

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    // credentials: "include" sends the httpOnly cookie with every request.
    credentials: auth ? "include" : "omit",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Token refresh: on 401, ask the Next.js refresh Route Handler to rotate
  // the httpOnly cookie, then retry the original request once.
  if (res.status === 401 && auth && !_retried) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true })
    }
    // Refresh failed — dispatch session-expired so AuthProvider redirects.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("mcp:session-expired"))
    }
    throw new ApiError("Session expired. Please sign in again.", 401)
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      message = data.message ?? data.error ?? message
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/**
 * Calls the Next.js /api/auth/refresh Route Handler, which reads the
 * mcp.refreshToken httpOnly cookie and sets a new mcp.token cookie.
 * Returns true on success.
 */
async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Wraps a live API call with a mock fallback. Only active when USE_MOCK_FALLBACK
 * is true (non-production). Emits a console.warn so mock mode is never silent.
 */
export async function withMock<T>(
  live: () => Promise<T>,
  mock: () => T | Promise<T>,
  useMock = false,
): Promise<T> {
  if (!useMock) return live()
  try {
    return await live()
  } catch (err) {
    if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
      throw err
    }
    console.warn(
      "[mcp-builder] Backend unreachable — serving mock data. " +
        "Set NEXT_PUBLIC_USE_MOCK=false to disable.",
    )
    return mock()
  }
}

/** Simulate latency for mock responses so loading states are visible. */
export function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

// Tokens are stored in httpOnly cookies and are never accessible to client JS.
// Auth for same-origin fetch/EventSource is handled automatically by the browser
// via credentials: "include" and the mcp.token cookie.
