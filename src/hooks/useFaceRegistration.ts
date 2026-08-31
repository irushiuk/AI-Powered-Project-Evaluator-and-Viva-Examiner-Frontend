'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { facePhotoService, type FacePhotoState } from '@/services/facePhotoService'

/**
 * A group viva is recorded as one composite video, so the report can only say
 * WHO answered by matching faces against a reference photo. Joining a session
 * is therefore gated on having one on file.
 *
 * The bar is deliberately "at least one photo uploaded or captured" — the
 * guided five-sample capture improves identification accuracy but is not a
 * precondition for joining, and older enrollments only ever stored one photo.
 */
export function isFaceRegistered(state: FacePhotoState | null) {
  if (!state) return false
  return Boolean(state.has_photo) || (state.sample_count ?? 0) > 0
}

// ── Shared store ────────────────────────────────────────────────────────────
// The navbar notification, the join buttons and the live-room guard all read
// this. Keeping it in one place means a single fetch per session and, more
// importantly, that registering on the profile page clears the notification
// everywhere at once instead of leaving it stale until a reload.

type Snapshot = {
  state: FacePhotoState | null
  loading: boolean
  error: boolean
  loaded: boolean
}

const EMPTY: Snapshot = { state: null, loading: false, error: false, loaded: false }

let snapshot: Snapshot = EMPTY
let cachedFor: string | null = null
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

function set(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => snapshot
const getServerSnapshot = () => EMPTY

function load(userKey: string, force = false): Promise<void> {
  const sameUser = cachedFor === userKey
  if (inFlight && sameUser) return inFlight
  if (sameUser && snapshot.loaded && !force) return Promise.resolve()

  // Log out, log in as someone else in the same tab: the previous student's
  // status must not carry over.
  if (!sameUser) set({ state: null, error: false, loaded: false })

  cachedFor = userKey
  set({ loading: true })
  inFlight = facePhotoService
    .get()
    .then((value) => set({ state: value, error: false, loading: false, loaded: true }))
    .catch(() =>
      // Status unknown. Consumers treat this as "don't block" rather than
      // locking a student out of their own viva over a transient API failure.
      set({ state: null, error: true, loading: false, loaded: true }),
    )
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/** Publish a freshly saved enrollment so every mounted consumer updates now. */
export function publishFaceRegistration(state: FacePhotoState) {
  set({ state, error: false, loading: false, loaded: true })
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useFaceRegistration() {
  const { user } = useAuthContext()
  const isStudent = user?.role === 'student'
  const userKey = user ? String(user.id) : null

  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (isStudent && userKey) void load(userKey)
  }, [isStudent, userKey])

  const refresh = useCallback(
    () => (isStudent && userKey ? load(userKey, true) : Promise.resolve()),
    [isStudent, userKey],
  )

  if (!isStudent) {
    return {
      state: null,
      loading: false,
      error: false,
      isStudent: false,
      registered: false,
      refresh,
    }
  }

  return {
    state: snap.state,
    // Before the effect has run nothing is loaded yet — report that as loading
    // so consumers never flash a "register your face" prompt at a student who
    // is in fact registered.
    loading: snap.loading || !snap.loaded,
    error: snap.error,
    isStudent: true,
    registered: isFaceRegistered(snap.state),
    refresh,
  }
}
