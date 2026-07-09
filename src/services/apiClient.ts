import { AUTH_API } from '@/constants/api.constant'

let logoutCallback: (() => Promise<void>) | null = null

export function setLogoutCallback(cb: () => Promise<void>) {
  logoutCallback = cb
}

// Kept for backwards compatibility with callers that still import it. Auth is
// now cookie-based, so there is no client-held access token to provide.
export function setAccessTokenGetter(_getter: () => string | null) {
  /* no-op: tokens live in HttpOnly cookies */
}

// De-dupe concurrent refreshes so a burst of 401s triggers a single refresh.
let refreshPromise: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(AUTH_API.refresh, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  // Always send cookies so the HttpOnly access token authenticates the request.
  const doFetch = () => fetch(input, { ...init, credentials: 'include' })

  let res = await doFetch()

  if (res.status === 401) {
    // Access token likely expired — try a single silent refresh, then retry.
    const refreshed = await refreshSession()
    if (refreshed) {
      res = await doFetch()
    }

    // Still unauthorized after refresh -> session is dead, log out.
    if (res.status === 401 && logoutCallback) {
      await logoutCallback()
    }
  }

  return res
}

export default apiFetch
