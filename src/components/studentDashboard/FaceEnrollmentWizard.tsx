'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, Loader2, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { Button } from '@/components/ui/button'
import { facePhotoService, type FacePhotoState } from '@/services/facePhotoService'
import {
  assessEnrollmentFrame,
  type EnrollmentFrameMetrics,
} from './faceEnrollmentQuality'

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

const STEPS = [
  { title: 'Look straight', detail: 'Keep a neutral expression and look at the camera.' },
  { title: 'Turn slightly left', detail: 'Keep both eyes visible and hold still.' },
  { title: 'Turn slightly right', detail: 'Use the opposite side from the previous sample.' },
  { title: 'Raise your chin slightly', detail: 'Only a small upward angle is needed.' },
  { title: 'Return to centre', detail: 'Look straight again with a natural expression.' },
]

type CapturedSample = {
  blob: Blob
  preview: string
  metrics: EnrollmentFrameMetrics
}

export default function FaceEnrollmentWizard({
  onSaved,
  onCancel,
}: {
  onSaved: (state: FacePhotoState) => void
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const samplesRef = useRef<CapturedSample[]>([])
  const [samples, setSamples] = useState<CapturedSample[]>([])
  const [cameraReady, setCameraReady] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('Starting camera and face quality checks…')
  const [error, setError] = useState('')

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    samplesRef.current.forEach((sample) => URL.revokeObjectURL(sample.preview))
    samplesRef.current = []
  }, [])

  useEffect(() => {
    let cancelled = false
    async function initialize() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const files = await FilesetResolver.forVisionTasks(WASM)
        const create = (delegate: 'GPU' | 'CPU') => FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL, delegate },
          runningMode: 'VIDEO',
          numFaces: 2,
          minFaceDetectionConfidence: .5,
          minFacePresenceConfidence: .5,
          minTrackingConfidence: .5,
        })
        let landmarker: FaceLandmarker
        try {
          landmarker = await create('GPU')
        } catch {
          landmarker = await create('CPU')
        }
        if (cancelled) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker
        setModelReady(true)
        setMessage('Position your face inside the guide.')
      } catch (reason) {
        setError(
          reason instanceof DOMException && reason.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access or use the upload option.'
            : 'The guided camera could not start. Please use the upload option.',
        )
      }
    }
    void initialize()
    return () => {
      cancelled = true
      stop()
    }
  }, [stop])

  async function capture() {
    const video = videoRef.current
    const landmarker = landmarkerRef.current
    if (!video || !video.videoWidth || !landmarker || !cameraReady) {
      setError('The camera and face checks are still starting.')
      return
    }

    setChecking(true)
    setError('')
    try {
      const result = landmarker.detectForVideo(video, performance.now())
      if (result.faceLandmarks.length !== 1) {
        setError(
          result.faceLandmarks.length > 1
            ? 'Only you should be visible during face registration.'
            : 'No clear face was detected. Face the camera and improve the lighting.',
        )
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not read the camera frame.')
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const quality = assessEnrollmentFrame(
        result.faceLandmarks[0],
        canvas,
        samples.length,
        samples.map((sample) => sample.metrics),
      )
      if (!quality.ok) {
        setError(quality.message)
        return
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', .92),
      )
      if (!blob) throw new Error('Could not capture this sample.')
      const next = [
        ...samples,
        { blob, preview: URL.createObjectURL(blob), metrics: quality.metrics },
      ]
      samplesRef.current = next
      setSamples(next)

      if (next.length === STEPS.length) {
        setSaving(true)
        setMessage('Saving five verified samples…')
        const state = await facePhotoService.upload(next.map((sample) => sample.blob))
        onSaved(state)
      } else {
        setMessage(`Sample ${next.length} passed all quality checks.`)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not capture this sample.')
    } finally {
      setChecking(false)
      setSaving(false)
    }
  }

  function restart() {
    samples.forEach((sample) => URL.revokeObjectURL(sample.preview))
    samplesRef.current = []
    setSamples([])
    setError('')
    setMessage('Position your face inside the guide.')
  }

  const step = STEPS[Math.min(samples.length, STEPS.length - 1)]
  const ready = cameraReady && modelReady

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
            <ShieldCheck className="h-4 w-4" /> Guided private registration
          </div>
          <h2 className="mt-1 text-xl font-semibold text-gray-950">
            {saving ? 'Completing registration' : `${step.title} · ${samples.length + 1} of ${STEPS.length}`}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{step.detail}</p>
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={onCancel} disabled={saving} aria-label="Close registration">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-slate-950">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            onLoadedMetadata={() => setCameraReady(true)}
            className="aspect-video h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[78%] w-[42%] rounded-[48%] border-2 border-dashed border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,.28)]" />
          </div>
          <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {ready ? message : 'Loading face quality checks…'}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4">
          <div className="space-y-2">
            {STEPS.map((item, index) => (
              <div key={item.title} className={`flex items-center gap-3 rounded-xl border p-3 ${index < samples.length ? 'border-emerald-200 bg-emerald-50' : index === samples.length ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${index < samples.length ? 'bg-emerald-600 text-white' : index === samples.length ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {index < samples.length ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="text-sm font-medium text-gray-800">{item.title}</span>
              </div>
            ))}
          </div>

          {error && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={capture} disabled={!ready || checking || saving}>
              {checking || saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {saving ? 'Saving registration…' : samples.length === STEPS.length - 1 ? 'Capture and register' : 'Capture sample'}
            </Button>
            {samples.length > 0 && (
              <Button type="button" variant="outline" onClick={restart} disabled={saving}>
                <RotateCcw className="h-4 w-4" /> Start over
              </Button>
            )}
          </div>
        </div>
      </div>

      {samples.length > 0 && (
        <div className="flex gap-2">
          {samples.map((sample, index) => (
            <img key={sample.preview} src={sample.preview} alt={`Verified sample ${index + 1}`} className="h-14 w-20 rounded-lg border border-emerald-200 object-cover" />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        These private biometric samples are used only to identify your contributions in group vivas. They are not visible to other students.
      </p>
    </div>
  )
}
