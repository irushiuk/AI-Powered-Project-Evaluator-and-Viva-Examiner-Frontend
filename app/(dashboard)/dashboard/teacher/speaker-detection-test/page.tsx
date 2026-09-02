"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Camera, CheckCircle2, Loader2, Mic, RefreshCw, UserRound, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { attributionService, type SpeakerDetectionTestResult } from "@/services/attributionService"
import { useReliableLiveSpeakerDetection, type SeatBinding } from "@/components/physicalEvaluation/hooks/useReliableLiveSpeakerDetection"
import { captureBindingFrames } from "@/components/physicalEvaluation/hooks/captureBindingFrames"

export default function SpeakerDetectionTestPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [result, setResult] = useState<SpeakerDetectionTestResult | null>(null)
  const [binding, setBinding] = useState(false)
  const [error, setError] = useState("")
  const bindings = (result?.bindings || []) as SeatBinding[]
  const names = useMemo(() => Object.fromEntries(
    (result?.accounts || []).map((account) => [account.student_id, account.student_name]),
  ), [result])
  const identifiedPeople = useMemo(() => {
    const people = new Map<string, SpeakerDetectionTestResult["bindings"][number]>()
    for (const item of result?.bindings || []) {
      if (item.student_id) people.set(item.student_id, item)
    }
    return [...people.values()]
  }, [result])
  const detector = useReliableLiveSpeakerDetection({
    enabled: Boolean(stream && bindings.some((item) => item.student_id)),
    sessionId: null,
    videoRef,
    stream,
    bindings,
    names,
    maxFaces: 3,
    persistEvidence: false,
  })

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream])

  async function startCamera() {
    setError("")
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      setStream(media)
      if (videoRef.current) {
        videoRef.current.srcObject = media
        await videoRef.current.play()
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Camera or microphone access failed.")
    }
  }

  async function bindFaces() {
    const video = videoRef.current
    if (!video?.videoWidth) return
    setBinding(true); setError(""); setResult(null)
    try {
      const frames = await captureBindingFrames(video)
      setResult(await attributionService.testSpeakerBinding(frames))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Face binding failed.")
    } finally { setBinding(false) }
  }

  return (
    <div className="mx-auto max-w-6xl py-8">
      <button onClick={() => router.back()} className="mb-5 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Speaker Detection Test</h1>
        <p className="mt-1 text-sm text-gray-500">Examiner-only diagnostic. Nothing here is saved as viva evidence or affects scores.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-slate-950 shadow-sm">
          <div className="relative aspect-video bg-black">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            {result?.bindings.map((item, index) => {
              const bbox = item.bbox
              if (!bbox || bbox.length !== 4) return null
              const [x0, y0, x1, y1] = bbox
              return (
                <div
                  key={`${item.student_id || "unknown"}-${index}`}
                  className={`pointer-events-none absolute border-2 ${item.student_id ? "border-emerald-400" : "border-red-400"}`}
                  style={{
                    left: `${Math.max(0, x0) * 100}%`,
                    top: `${Math.max(0, y0) * 100}%`,
                    width: `${Math.max(0, Math.min(1, x1) - Math.max(0, x0)) * 100}%`,
                    height: `${Math.max(0, Math.min(1, y1) - Math.max(0, y0)) * 100}%`,
                  }}
                >
                  <span className={`absolute -top-7 left-0 whitespace-nowrap rounded px-2 py-1 text-xs font-semibold text-white ${item.student_id ? "bg-emerald-600" : "bg-red-600"}`}>
                    {item.student_name}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3 p-4">
            <Button onClick={startCamera} variant="outline" className="border-slate-600 bg-slate-900 text-white hover:bg-slate-800 hover:text-white">
              <Camera className="h-4 w-4" /> {stream ? "Restart camera" : "Start camera"}
            </Button>
            <Button onClick={bindFaces} disabled={!stream || binding} className="bg-blue-600 hover:bg-blue-700">
              {binding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {binding ? "Scanning for 3 seconds…" : "Bind uploaded faces"}
            </Button>
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Enrollment accounts</h2>
            {result?.accounts.map((account) => (
              <div key={account.email} className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 text-sm">
                <div><div className="font-medium text-gray-800">{account.student_name}</div><div className="text-xs text-gray-500">{account.email}</div></div>
                {account.has_photo ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
              </div>
            )) || <p className="text-sm text-gray-500">Bind a camera frame to verify the two accounts and their photos.</p>}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Live result</h2>
            <div className={`rounded-xl border p-4 ${detector.status === "speaking" ? "border-emerald-200 bg-emerald-50" : detector.status === "uncertain" ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex items-center gap-2">
                {detector.status === "speaking" ? <Mic className="h-5 w-5 text-emerald-600" /> : <UserRound className="h-5 w-5 text-gray-500" />}
                <span className="font-semibold text-gray-900">
                  {detector.status === "speaking"
                    ? `${detector.studentName} is speaking`
                    : detector.status === "uncertain"
                      ? "Voice heard — speaker uncertain"
                      : detector.status === "loading"
                        ? "Waiting for successful face binding"
                        : detector.status === "audio_blocked"
                          ? "Microphone analysis needs activation"
                          : detector.status === "no_faces"
                            ? "No faces visible"
                            : detector.status === "tracking_lost"
                              ? "Face tracking lost"
                              : detector.status === "unavailable"
                                ? "Detection unavailable"
                                : "Ready and listening"}
                </span>
              </div>
              {detector.status === "speaking" && <p className="mt-2 text-sm text-emerald-700">Confidence: {Math.round(detector.confidence * 100)}%</p>}
              {detector.error && <p className="mt-2 text-sm text-red-600">{detector.error}</p>}
              {detector.status === "audio_blocked" && (
                <Button onClick={() => void detector.activateAudio()} size="sm" className="mt-3">
                  <Mic className="h-4 w-4" /> Enable microphone analysis
                </Button>
              )}
            </div>
            {result && (
              <div className="mt-4 space-y-3">
                <div className="text-sm text-gray-600">
                  Recognized people: <strong>{identifiedPeople.length}</strong> · Unknown faces: <strong>{result.bindings.filter((item) => !item.student_id).length}</strong>
                </div>
                {identifiedPeople.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Identified people</p>
                    <div className="space-y-2">
                      {identifiedPeople.map((person) => (
                        <div key={person.student_id || person.email || person.student_name} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900">{person.student_name}</div>
                            <div className="truncate text-xs text-gray-500">{person.email}</div>
                          </div>
                          <div className="text-right text-xs text-emerald-700">
                            <div>{Math.round(person.confidence * 100)}% confidence</div>
                            <div>{person.votes || 1}/{person.frames_processed || result.frames_processed} frames</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">No enrolled student was identified in this scan.</p>
                )}
              </div>
            )}
          </section>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        </div>
      </div>
    </div>
  )
}
