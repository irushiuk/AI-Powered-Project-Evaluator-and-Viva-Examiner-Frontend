import apiFetch from './apiClient'
import { AUTH_API } from '@/constants/api.constant'

/**
 * Face enrollment — the reference photo that lets the examiner's report say
 * WHO answered in a group viva (the recording frames everyone at once, so
 * speakers are identified by face). Students manage only their own photo.
 */
export interface FacePhotoState {
  has_photo: boolean
  photo_url: string | null
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const err = await res.json().catch(() => ({}))
  throw new Error(err.message || fallback)
}

export const facePhotoService = {
  /** Current photo state, with a short-lived preview URL when one exists. */
  async get(): Promise<FacePhotoState> {
    const res = await apiFetch(AUTH_API.facePhoto)
    if (!res.ok) await parseError(res, 'Failed to load your face photo')
    const body = await res.json()
    return (body.data ?? body) as FacePhotoState
  },

  /** Store or replace the photo. */
  async upload(photo: Blob, filename = 'face.jpg'): Promise<FacePhotoState> {
    const form = new FormData()
    form.append('photo', photo, filename)
    const res = await apiFetch(AUTH_API.facePhoto, {
      method: 'POST',
      body: form, // browser sets the multipart boundary
    })
    if (!res.ok) await parseError(res, 'Failed to save your face photo')
    const body = await res.json()
    return (body.data ?? body) as FacePhotoState
  },
}
