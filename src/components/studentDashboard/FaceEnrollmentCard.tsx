'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, Loader2, ScanFace, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { facePhotoService } from '@/services/facePhotoService'

/**
 * Face enrollment for group vivas.
 *
 * A group viva is recorded as one video of everyone at once, so the examiner's
 * report can only credit answers to the right person if each student has a
 * reference photo to match against. Without one, that student's speaking turns
 * are reported as "unknown" — hence the prompt, which is informative rather
 * than blocking.
 */
export default function FaceEnrollmentCard() {
  const [hasPhoto, setHasPhoto] = useState<boolean | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [starting, setStarting] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    facePhotoService
      .get()
      .then((state) => {
        if (cancelled) return
        setHasPhoto(state.has_photo)
        setPhotoUrl(state.photo_url)
      })
      .catch(() => {
        // Examiners (and any non-student) get a 403 here — just stay hidden.
        if (!cancelled) setHasPhoto(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stopCamera = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((t) => t.stop())
      return null
    })
    setCameraReady(false)
  }, [])

  // Release the camera if the card unmounts mid-capture.
  useEffect(() => stopCamera, [stopCamera])

  /**
   * Attach the stream once BOTH the stream and the <video> element exist.
   * Doing this in an effect (rather than a setTimeout after setState) is what
   * makes capture reliable: the element is guaranteed to be committed here, so
   * srcObject is always set and videoWidth actually becomes non-zero.
   */
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return

    video.srcObject = stream
    video.play().catch((err) => {
      // Never silent: a video that won't play means capture can't work.
      console.warn('Face camera preview failed to play:', err)
      toast.error('Camera preview could not start. Try the Upload option.')
    })

    return () => {
      video.srcObject = null
    }
  }, [stream])

  async function startCamera() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Your browser blocks camera access here. Use Upload instead.')
      return
    }
    setStarting(true)
    setCameraReady(false)
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setStream(media)
    } catch (err) {
      console.warn('getUserMedia failed:', err)
      toast.error(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow it, or use Upload instead.'
          : 'Could not access your camera. Use Upload instead.',
      )
    } finally {
      setStarting(false)
    }
  }

  async function save(blob: Blob, filename: string) {
    setSaving(true)
    try {
      const state = await facePhotoService.upload(blob, filename)
      setHasPhoto(state.has_photo)
      setPhotoUrl(state.photo_url)
      stopCamera()
      toast.success('Face photo saved.')
    } catch (err) {
      console.warn('Face photo upload failed:', err)
      toast.error(err instanceof Error ? err.message : 'Could not save your photo.')
    } finally {
      setSaving(false)
    }
  }

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      // Previously a silent return — the button appeared dead. Say so instead.
      toast.error('Camera is still starting. Try again in a moment.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      toast.error('Could not capture the photo.')
      return
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) void save(blob, 'face.jpg')
        else toast.error('Could not capture the photo. Try Upload instead.')
      },
      'image/jpeg',
      0.92,
    )
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be re-picked after an error
    if (!file) return
    if (!/\.(jpe?g|png)$/i.test(file.name)) {
      toast.error('Please choose a .jpg or .png photo.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB.')
      return
    }
    void save(file, file.name)
  }

  if (hasPhoto === null) return null

  const capturing = stream !== null

  return (
    <Card className={hasPhoto ? '' : 'border-blue-200 bg-blue-50/50'}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          {hasPhoto && photoUrl ? (
            // Plain <img>: the source is a time-limited SAS URL on a private
            // container, which next/image's optimizer cannot fetch or cache.
            <img
              src={photoUrl}
              alt="Your enrolled face photo"
              className="h-12 w-12 shrink-0 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <ScanFace className="h-5 w-5 text-blue-600" />
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
              {hasPhoto ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> Face photo enrolled
                </>
              ) : (
                'Add your face photo'
              )}
            </p>
            <p className="text-xs text-gray-500">
              {hasPhoto
                ? 'Used to credit your answers to you in group vivas.'
                : 'In a group viva everyone shares one recording. This photo lets your examiner tell which answers were yours.'}
            </p>
          </div>
        </div>

        {capturing ? (
          <div className="flex flex-col items-center gap-2">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              onLoadedMetadata={() => setCameraReady(true)}
              className="h-32 w-44 rounded-lg border border-gray-200 bg-black object-cover"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={capture} disabled={saving || !cameraReady}>
                {saving ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="mr-1 h-3.5 w-3.5" />
                )}
                {cameraReady ? 'Take photo' : 'Starting…'}
              </Button>
              <Button size="sm" variant="ghost" onClick={stopCamera} disabled={saving}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={startCamera} disabled={saving || starting}>
              {starting ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="mr-1 h-3.5 w-3.5" />
              )}
              {hasPhoto ? 'Retake' : 'Use camera'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1 h-3.5 w-3.5" />
              )}
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={onFilePicked}
              className="hidden"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
