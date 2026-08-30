"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision"
import { physicalEvaluationService } from "@/services/physicalEvaluationService"

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
type Box = [number, number, number, number]
export type SeatBinding = { student_id: string | null; bbox?: number[] | null; confidence: number }
type Event = { student_id: string | null; t_start: string; t_end: string; confidence: number }
type Turn = { student: string | null; start: Date; confidence: number; samples: number }

const boxOf = (points: NormalizedLandmark[]): Box => {
  const xs = points.map((point) => point.x), ys = points.map((point) => point.y)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}
const distance = (a: Box, b: Box) => Math.hypot(
  (a[0] + a[2] - b[0] - b[2]) / 2,
  (a[1] + a[3] - b[1] - b[3]) / 2,
)
const blendBox = (previous: Box, current: Box): Box => [
  previous[0] * .65 + current[0] * .35,
  previous[1] * .65 + current[1] * .35,
  previous[2] * .65 + current[2] * .35,
  previous[3] * .65 + current[3] * .35,
]
const mouth = (p: NormalizedLandmark[]) => {
  if (!p[13] || !p[14] || !p[78] || !p[308]) return 0
  const open = Math.hypot(p[13].x - p[14].x, p[13].y - p[14].y)
  const width = Math.max(.001, Math.hypot(p[78].x - p[308].x, p[78].y - p[308].y))
  return open / width
}

export function useLiveSpeakerDetection(options: {
  enabled: boolean
  sessionId: string | null
  videoRef: RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  bindings: SeatBinding[]
  names: Record<string, string>
  maxFaces: number
  persistEvidence?: boolean
}) {
  const { enabled, sessionId, videoRef, stream, bindings, names, maxFaces, persistEvidence = true } = options
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "speaking" | "uncertain" | "unavailable">("idle")
  const [studentId, setStudentId] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState("")
  const pending = useRef<Event[]>([]), turn = useRef<Turn | null>(null)
  const previous = useRef<Record<string, number>>({}), sendChain = useRef(Promise.resolve(0))

  const send = useCallback(async () => {
    if (!persistEvidence) { pending.current = []; return 0 }
    if (!sessionId || !pending.current.length) return 0
    const events = pending.current.splice(0)
    sendChain.current = sendChain.current.then(() => physicalEvaluationService.sendSpeakerEvidence(sessionId, events))
    return sendChain.current
  }, [persistEvidence, sessionId])
  const close = useCallback((end = new Date()) => {
    const current = turn.current; turn.current = null
    if (!current || end.getTime() - current.start.getTime() < 700) return
    pending.current.push({ student_id: current.student, t_start: current.start.toISOString(), t_end: end.toISOString(), confidence: current.confidence / current.samples })
    if (pending.current.length >= 4) void send()
  }, [send])
  const update = useCallback((student: string | null, value: number) => {
    if (!turn.current || turn.current.student !== student) {
      close(); turn.current = { student, start: new Date(), confidence: value, samples: 1 }
    } else { turn.current.confidence += value; turn.current.samples += 1 }
  }, [close])
  const flush = useCallback(async () => { close(); await send(); await sendChain.current }, [close, send])

  useEffect(() => {
    if (!enabled || (persistEvidence && !sessionId) || !stream || !bindings.some((binding) => binding.student_id)) {
      setStatus(enabled ? "loading" : "idle"); return
    }
    const track = stream.getAudioTracks()[0]
    if (!track) { setStatus("unavailable"); setError("Microphone access is required."); return }
    let cancelled = false, timer = 0, landmarker: FaceLandmarker | null = null
    const context = new AudioContext(), analyser = context.createAnalyser()
    analyser.fftSize = 1024
    context.createMediaStreamSource(stream).connect(analyser)
    const samples = new Float32Array(analyser.fftSize), noise = { value: .008 }
    // Bindings start from the recognition burst, then follow each face's
    // current position. Comparing forever with the original seat box caused
    // normal leaning and posture changes to lose a correctly named student.
    const trackedBoxes: Record<string, Box> = Object.fromEntries(
      bindings
        .filter((binding) => binding.student_id && binding.bbox?.length === 4)
        .map((binding) => [binding.student_id as string, binding.bbox as Box]),
    )
    void context.resume()

    const start = async () => {
      try {
        setStatus("loading"); setError("")
        const files = await FilesetResolver.forVisionTasks(WASM)
        landmarker = await FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" }, runningMode: "VIDEO",
          numFaces: Math.max(1, maxFaces), minFaceDetectionConfidence: .3,
          minFacePresenceConfidence: .3, minTrackingConfidence: .5,
        })
        if (cancelled) return
        setStatus("ready")
        timer = window.setInterval(() => {
          const video = videoRef.current
          if (!video || video.readyState < 2 || !landmarker) return
          analyser.getFloatTimeDomainData(samples)
          const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length)
          const voice = rms > Math.max(.018, noise.value * 2.6)
          if (!voice) noise.value = noise.value * .97 + Math.min(rms, .03) * .03
          const detected = landmarker.detectForVideo(video, performance.now()).faceLandmarks
            .map((points) => ({ points, box: boxOf(points) }))
          const candidates = detected.flatMap((face, faceIndex) =>
            Object.entries(trackedBoxes).map(([id, tracked]) => ({
              id,
              faceIndex,
              distance: distance(tracked, face.box),
            })),
          ).sort((a, b) => a.distance - b.distance)
          const usedFaces = new Set<number>(), usedStudents = new Set<string>()
          const assignments: Array<{ id: string; faceIndex: number }> = []
          for (const candidate of candidates) {
            if (candidate.distance > .32) continue
            if (usedFaces.has(candidate.faceIndex) || usedStudents.has(candidate.id)) continue
            usedFaces.add(candidate.faceIndex); usedStudents.add(candidate.id)
            assignments.push(candidate)
            trackedBoxes[candidate.id] = blendBox(
              trackedBoxes[candidate.id], detected[candidate.faceIndex].box,
            )
          }

          const scores: { id: string; score: number }[] = []
          for (const { id, faceIndex } of assignments) {
            const points = detected[faceIndex].points
            const openness = mouth(points)
            scores.push({ id, score: Math.abs(openness - (previous.current[id] ?? openness)) })
            previous.current[id] = openness
          }
          if (!voice) { close(); setStudentId(null); setConfidence(0); setStatus("ready"); return }
          scores.sort((a, b) => b.score - a.score)
          const winner = scores[0], runner = scores[1]?.score || 0
          if (!winner || winner.score < .025 || winner.score - runner < .008) {
            update(null, .25); setStudentId(null); setConfidence(0); setStatus("uncertain"); return
          }
          const certainty = Math.min(1, .5 + (winner.score - runner) / Math.max(winner.score, .001))
          update(winner.id, certainty); setStudentId(winner.id); setConfidence(certainty); setStatus("speaking")
        }, 200)
      } catch (reason) {
        setStatus("unavailable"); setError(reason instanceof Error ? reason.message : "Speaker detection failed.")
      }
    }
    void start()
    return () => { cancelled = true; window.clearInterval(timer); close(); void send(); landmarker?.close(); void context.close() }
  }, [bindings, close, enabled, maxFaces, persistEvidence, send, sessionId, stream, update, videoRef])

  return { status, studentId, studentName: studentId ? names[studentId] : null, confidence, error, flush }
}
