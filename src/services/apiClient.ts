let accessTokenGetter: (() => string | null) | null = null
let logoutCallback: (() => Promise<void>) | null = null

export function setAccessTokenGetter(getter: () => string | null) {
  accessTokenGetter = getter
}

export function setLogoutCallback(cb: () => Promise<void>) {
  logoutCallback = cb
}

export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const token = accessTokenGetter ? accessTokenGetter() : null
  const headers = new Headers(init?.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(input, { ...init, headers })
  if (res.status === 401 && logoutCallback) {
    // token expired or invalid - let logout handler decide
    await logoutCallback()
  }
  return res
}

export default apiFetch
