// Auth is cookie-based (HttpOnly). The frontend no longer stores tokens in
// localStorage or writes JS-readable cookies. These names are only used by
// server-side code (middleware, SSR fetch) to read the cookies Django sets.
export const COOKIE_NAMES = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
}
