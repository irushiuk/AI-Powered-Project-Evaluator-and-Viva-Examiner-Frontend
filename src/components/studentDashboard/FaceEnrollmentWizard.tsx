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
const AUTO_CHECK_INTERVAL_MS = 140
const AUTO_HOLD_MS = 900
const AUTO_STEP_COOLDOWN_MS = 1100

const STEPS = [
  { title: 'Look straight', detail: 'Keep a neutral expression and look at the camera.' },
  { title: 'Turn slightly to one side', detail: 'Keep both eyes visible and hold still.' },
  { title: 'Turn to the other side', detail: 'Use the opposite side from the previous sample.' },
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
  const captureLockRef = useRef(false)
  const savingRef = useRef(false)
  const stableSinceRef = useRef<number | null>(null)
  const stableMetricsRef = useRef<EnrollmentFrameMetrics | null>(null)
  const cooldownUntilRef = useRef(0)
  const [samples, setSamples] = useState<CapturedSample[]>([])
  const [cameraReady, setCameraReady] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [message, setMessage] = useState('Starting camera and face quality checks…')
  const [error, setError] = useState('')

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    captureLockRef.current = false
    savingRef.current = false
    stableSinceRef.current = null
    stableMetricsRef.current = null
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
        cooldownUntilRef.current = performance.now() + 600
        setMessage('Position your face inside the guide. Capture will happen automatically.')
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

  const evaluateCurrentFrame = useCallback(() => {
    const video = videoRef.current
    const landmarker = landmarkerRef.current
    if (!video || !video.videoWidth || !landmarker || !cameraReady) {
      return { ok: false as const, message: 'The camera and face checks are still starting.' }
    }

    const result = landmarker.detectForVideo(video, performance.now())
    if (result.faceLandmarks.length !== 1) {
      return {
        ok: false as const,
        message: result.faceLandmarks.length > 1
          ? 'Only you should be visible during face registration.'
          : 'No clear face detected. Face the camera and improve the lighting.',
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return { ok: false as const, message: 'Could not read the camera frame.' }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const currentSamples = samplesRef.current
    const quality = assessEnrollmentFrame(
      result.faceLandmarks[0],
      canvas,
      currentSamples.length,
      currentSamples.map((sample) => sample.metrics),
    )
    if (!quality.ok) return quality
    return { ok: true as const, canvas, metrics: quality.metrics }
  }, [cameraReady])

  const saveVerifiedSample = useCallback(async (
    canvas: HTMLCanvasElement,
    metrics: EnrollmentFrameMetrics,
  ) => {
    const previous = samplesRef.current
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', .92),
    )
    if (!blob) throw new Error('Could not capture this sample.')
    const next = [
      ...previous,
      { blob, preview: URL.createObjectURL(blob), metrics },
    ]
    samplesRef.current = next
    setSamples(next)
    setHoldProgress(0)

    if (next.length === STEPS.length) {
      savingRef.current = true
      setSaving(true)
      setMessage('All five views passed. Saving your registration…')
      try {
        const state = await facePhotoService.upload(next.map((sample) => sample.blob))
        onSaved(state)
      } catch (reason) {
        URL.revokeObjectURL(next[next.length - 1].preview)
        samplesRef.current = previous
        setSamples(previous)
        throw reason
      } finally {
        savingRef.current = false
        setSaving(false)
      }
    } else {
      setMessage(`View ${next.length} captured successfully. Get ready for the next instruction.`)
    }
  }, [onSaved])

  useEffect(() => {
    if (!cameraReady || !modelReady) return
    let cancelled = false
    let animationFrame = 0
    let lastCheckedAt = 0

    const resetStability = () => {
      stableSinceRef.current = null
      stableMetricsRef.current = null
      setHoldProgress(0)
    }

    const check = async (now: number) => {
      if (
        cancelled
        || captureLockRef.current
        || savingRef.current
        || now < cooldownUntilRef.current
        || now - lastCheckedAt < AUTO_CHECK_INTERVAL_MS
      ) return
      lastCheckedAt = now
      captureLockRef.current = true
      try {
        const frame = evaluateCurrentFrame()
        if (!frame.ok) {
          resetStability()
          setMessage(frame.message)
          return
        }

        const previousMetrics = stableMetricsRef.current
        const moved = previousMetrics && (
          Math.abs(frame.metrics.noseX - previousMetrics.noseX) > .028
          || Math.abs(frame.metrics.noseY - previousMetrics.noseY) > .028
        )
        if (moved || stableSinceRef.current === null) {
          stableSinceRef.current = now
          stableMetricsRef.current = frame.metrics
          setHoldProgress(0)
          setMessage('Correct position found. Hold still…')
          return
        }

        stableMetricsRef.current = frame.metrics
        const elapsed = now - stableSinceRef.current
        const progress = Math.min(100, Math.round((elapsed / AUTO_HOLD_MS) * 100))
        setHoldProgress(progress)
        setMessage(progress < 100 ? 'Hold still — capturing automatically…' : 'Capturing…')
        if (elapsed < AUTO_HOLD_MS) return

        resetStability()
        setError('')
        await saveVerifiedSample(frame.canvas, frame.metrics)
        cooldownUntilRef.current = performance.now() + AUTO_STEP_COOLDOWN_MS
      } catch (reason) {
        resetStability()
        setError(reason instanceof Error ? reason.message : 'Automatic capture failed. Try the manual button.')
        cooldownUntilRef.current = performance.now() + AUTO_STEP_COOLDOWN_MS
      } finally {
        captureLockRef.current = false
      }
    }

    const loop = (now: number) => {
      if (cancelled) return
      animationFrame = requestAnimationFrame(loop)
      void check(now)
    }
    animationFrame = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      cancelAnimationFrame(animationFrame)
    }
  }, [cameraReady, modelReady, evaluateCurrentFrame, saveVerifiedSample])

  async function capture() {
    if (captureLockRef.current || savingRef.current) return
    captureLockRef.current = true
    setChecking(true)
    setError('')
    try {
      const frame = evaluateCurrentFrame()
      if (!frame.ok) {
        setError(frame.message)
        return
      }
      stableSinceRef.current = null
      stableMetricsRef.current = null
      await saveVerifiedSample(frame.canvas, frame.metrics)
      cooldownUntilRef.current = performance.now() + AUTO_STEP_COOLDOWN_MS
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not capture this sample.')
    } finally {
      captureLockRef.current = false
      setChecking(false)
    }
  }

  function restart() {
    samples.forEach((sample) => URL.revokeObjectURL(sample.preview))
    samplesRef.current = []
    setSamples([])
    stableSinceRef.current = null
    stableMetricsRef.current = null
    cooldownUntilRef.current = performance.now() + 600
    setHoldProgress(0)
    setError('')
    setMessage('Position your face inside the guide. Capture will happen automatically.')
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
          <div className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur">
            Automatic capture on
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

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-blue-800">
              <span>Hold the requested position</span>
              <span>{holdProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-150"
                style={{ width: `${holdProgress}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={capture} disabled={!ready || checking || saving}>
              {checking || saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {saving ? 'Saving registration…' : 'Capture manually'}
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
