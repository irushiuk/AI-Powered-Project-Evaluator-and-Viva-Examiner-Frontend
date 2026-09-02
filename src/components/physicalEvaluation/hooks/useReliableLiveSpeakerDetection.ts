"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision"
import { physicalEvaluationService } from "@/services/physicalEvaluationService"

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
const SAMPLE_INTERVAL_MS = 160
const TRACK_MATCH_DISTANCE = .42
const VOICE_HOLD_MS = 450
const VOTE_WINDOW_MS = 1_200
const SPEAKER_HOLD_MS = 1_100

type Box = [number, number, number, number]
export type SeatBinding = { student_id: string | null; bbox?: number[] | null; confidence: number }
type Event = { student_id: string | null; t_start: string; t_end: string; confidence: number }
type Turn = { student: string | null; start: Date; confidence: number; samples: number }
type Vote = { id: string; score: number; at: number }
export type LiveSpeakerStatus =
  | "idle"
  | "loading"
  | "ready"
  | "speaking"
  | "uncertain"
  | "audio_blocked"
  | "no_faces"
  | "tracking_lost"
  | "unavailable"

const boxOf = (points: NormalizedLandmark[]): Box => {
  const xs = points.map((point) => point.x), ys = points.map((point) => point.y)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

const distance = (a: Box, b: Box) => Math.hypot(
  (a[0] + a[2] - b[0] - b[2]) / 2,
  (a[1] + a[3] - b[1] - b[3]) / 2,
)

const blendBox = (previous: Box, current: Box): Box => [
  previous[0] * .55 + current[0] * .45,
  previous[1] * .55 + current[1] * .45,
  previous[2] * .55 + current[2] * .45,
  previous[3] * .55 + current[3] * .45,
]

const mouth = (points: NormalizedLandmark[]) => {
  if (!points[13] || !points[14] || !points[78] || !points[308]) return 0
  const open = Math.hypot(points[13].x - points[14].x, points[13].y - points[14].y)
  const width = Math.max(.001, Math.hypot(points[78].x - points[308].x, points[78].y - points[308].y))
  return open / width
}

/** A rolling score avoids missing speech just because one sample is quiet. */
const mouthActivity = (history: number[]) => {
  const recent = history.slice(-6)
  if (recent.length < 3) return 0
  const deltas = recent.slice(1).map((value, index) => Math.abs(value - recent[index]))
  const average = deltas.reduce((sum, value) => sum + value, 0) / deltas.length
  return average * .65 + Math.max(...deltas) * .35
}

export function useReliableLiveSpeakerDetection(options: {
  enabled: boolean
  sessionId: string | null
  videoRef: RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  bindings: SeatBinding[]
  names: Record<string, string>
  maxFaces: number
  persistEvidence?: boolean
  paused?: boolean
}) {
  const {
    enabled,
    sessionId,
    videoRef,
    stream,
    bindings,
    names,
    maxFaces,
    persistEvidence = true,
    paused = false,
  } = options
  const [status, setStatus] = useState<LiveSpeakerStatus>("idle")
  const [studentId, setStudentId] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState("")
  const [audioActive, setAudioActive] = useState(false)
  const pending = useRef<Event[]>([]), turn = useRef<Turn | null>(null)
  const sendChain = useRef(Promise.resolve(0))
  const pausedRef = useRef(paused), persistEvidenceRef = useRef(persistEvidence)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { persistEvidenceRef.current = persistEvidence }, [persistEvidence])

  const send = useCallback(async () => {
    if (!persistEvidenceRef.current) { pending.current = []; return 0 }
    if (!sessionId || !pending.current.length) return 0
    const events = pending.current.splice(0)
    sendChain.current = sendChain.current.then(() =>
      physicalEvaluationService.sendSpeakerEvidence(sessionId, events),
    )
    return sendChain.current
  }, [sessionId])

  const close = useCallback((end = new Date()) => {
    const current = turn.current
    turn.current = null
    if (!current || end.getTime() - current.start.getTime() < 700) return
    if (!persistEvidenceRef.current) return
    pending.current.push({
      student_id: current.student,
      t_start: current.start.toISOString(),
      t_end: end.toISOString(),
      confidence: current.confidence / current.samples,
    })
    if (pending.current.length >= 4) void send()
  }, [send])

  const update = useCallback((student: string | null, value: number) => {
    if (!turn.current || turn.current.student !== student) {
      close()
      turn.current = { student, start: new Date(), confidence: value, samples: 1 }
    } else {
      turn.current.confidence += value
      turn.current.samples += 1
    }
  }, [close])

  const flush = useCallback(async () => {
    close()
    await send()
    await sendChain.current
  }, [close, send])

  /** Invoke from a user click so browser autoplay policy permits Web Audio. */
  const activateAudio = useCallback(async () => {
    const context = audioContextRef.current
    if (!context || context.state === "closed") return false
    try {
      if (context.state !== "running") await context.resume()
      const active = context.state === "running"
      setAudioActive(active)
      if (active) setError("")
      return active
    } catch {
      setAudioActive(false)
      setStatus("audio_blocked")
      setError("Microphone analysis is paused by the browser. Click a session control to enable it.")
      return false
    }
  }, [])

  useEffect(() => {
    const knownBindings = bindings.filter(
      (binding): binding is SeatBinding & { student_id: string; bbox: number[] } =>
        Boolean(binding.student_id) && binding.bbox?.length === 4,
    )
    if (!enabled || !stream || !bindings.some((binding) => binding.student_id)) {
      setStatus(enabled ? "loading" : "idle")
      return
    }
    if (!knownBindings.length) {
      setStatus("tracking_lost")
      setError("The identity result did not include face positions. Retry identification.")
      return
    }
    const track = stream.getAudioTracks()[0]
    if (!track) {
      setStatus("unavailable")
      setError("Microphone access is required for speaker detection.")
      return
    }

    let cancelled = false, timer = 0, landmarker: FaceLandmarker | null = null
    let consecutiveVisionErrors = 0, voiceUntil = 0, lastFaceAt = performance.now()
    const context = new AudioContext(), analyser = context.createAnalyser()
    analyser.fftSize = 1024
    context.createMediaStreamSource(stream).connect(analyser)
    audioContextRef.current = context
    const samples = new Float32Array(analyser.fftSize)
    const noise = { value: .0035 }
    const histories: Record<string, number[]> = {}
    let votes: Vote[] = []
    let lastResolved: { id: string; confidence: number; until: number } | null = null

    // ArcFace supplies identity once. The lightweight tracker then follows
    // those faces throughout setup, presentation, playback and answering.
    const trackedBoxes: Record<string, Box> = Object.fromEntries(
      knownBindings.map((binding) => [binding.student_id, binding.bbox as Box]),
    )

    context.onstatechange = () => {
      if (cancelled) return
      const active = context.state === "running"
      setAudioActive(active)
      if (!active) {
        close()
        setStudentId(null)
        setConfidence(0)
        setStatus("audio_blocked")
        setError("Microphone analysis is paused by the browser. Click a session control to enable it.")
      }
    }

    const start = async () => {
      try {
        setStatus("loading")
        setError("")
        const files = await FilesetResolver.forVisionTasks(WASM)
        const options = {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" as const },
          runningMode: "VIDEO" as const,
          numFaces: Math.max(1, maxFaces),
          minFaceDetectionConfidence: .3,
          minFacePresenceConfidence: .3,
          minTrackingConfidence: .45,
        }
        try {
          landmarker = await FaceLandmarker.createFromOptions(files, options)
        } catch {
          landmarker = await FaceLandmarker.createFromOptions(files, {
            ...options,
            baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
          })
        }
        if (cancelled) return

        const audioStarted = await activateAudio()
        if (audioStarted) setStatus("ready")

        timer = window.setInterval(() => {
          const video = videoRef.current
          if (!video || video.readyState < 2 || !landmarker) return

          try {
            const now = performance.now()
            const detected = landmarker.detectForVideo(video, now).faceLandmarks
              .map((points) => ({ points, box: boxOf(points) }))
            consecutiveVisionErrors = 0

            if (detected.length) lastFaceAt = now
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
              if (candidate.distance > TRACK_MATCH_DISTANCE) continue
              if (usedFaces.has(candidate.faceIndex) || usedStudents.has(candidate.id)) continue
              usedFaces.add(candidate.faceIndex)
              usedStudents.add(candidate.id)
              assignments.push(candidate)
              trackedBoxes[candidate.id] = blendBox(
                trackedBoxes[candidate.id], detected[candidate.faceIndex].box,
              )
            }

            const scores: Array<{ id: string; score: number }> = []
            for (const { id, faceIndex } of assignments) {
              const history = histories[id] || []
              history.push(mouth(detected[faceIndex].points))
              if (history.length > 8) history.shift()
              histories[id] = history
              scores.push({ id, score: mouthActivity(history) })
            }

            // AI speech is never attributed, but tracking and mouth baselines
            // continue so participants cannot be lost while a question plays.
            if (pausedRef.current) {
              close()
              votes = []
              lastResolved = null
              setStudentId(null)
              setConfidence(0)
              setStatus(context.state === "running" ? "ready" : "audio_blocked")
              return
            }
            if (context.state !== "running") {
              close()
              setStudentId(null)
              setConfidence(0)
              setStatus("audio_blocked")
              return
            }
            if (!detected.length && now - lastFaceAt > 900) {
              close()
              setStudentId(null)
              setConfidence(0)
              setStatus("no_faces")
              return
            }
            if (!assignments.length) {
              close()
              setStudentId(null)
              setConfidence(0)
              setStatus("tracking_lost")
              return
            }

            analyser.getFloatTimeDomainData(samples)
            const rms = Math.sqrt(
              samples.reduce((sum, value) => sum + value * value, 0) / samples.length,
            )
            const threshold = Math.max(.006, noise.value * 1.8)
            const freshVoice = rms > threshold
            if (freshVoice) voiceUntil = now + VOICE_HOLD_MS
            const voice = now < voiceUntil
            if (!voice) noise.value = noise.value * .96 + Math.min(rms, .025) * .04

            if (!voice) {
              close()
              votes = []
              lastResolved = null
              setStudentId(null)
              setConfidence(0)
              setStatus("ready")
              return
            }

            scores.sort((a, b) => b.score - a.score)
            const winner = scores[0], runnerScore = scores[1]?.score || 0
            const decisive = Boolean(
              winner &&
              winner.score >= .008 &&
              (winner.score - runnerScore >= .0025 || winner.score >= runnerScore * 1.25),
            )
            if (winner && decisive) votes.push({ id: winner.id, score: winner.score, at: now })
            votes = votes.filter((vote) => now - vote.at <= VOTE_WINDOW_MS)

            const voteSummary = Object.values(votes.reduce<Record<string, { id: string; count: number; activity: number }>>(
              (summary, vote) => {
                const current = summary[vote.id] || { id: vote.id, count: 0, activity: 0 }
                current.count += 1
                current.activity += vote.score
                summary[vote.id] = current
                return summary
              },
              {},
            )).sort((a, b) => b.count - a.count || b.activity - a.activity)
            const top = voteSummary[0], second = voteSummary[1]
            const consensus = top && top.count >= 2 && (!second || top.count > second.count)

            if (consensus) {
              const certainty = Math.min(.98, .58 + top.count * .08)
              lastResolved = { id: top.id, confidence: certainty, until: now + SPEAKER_HOLD_MS }
            }
            if (lastResolved && now <= lastResolved.until) {
              update(lastResolved.id, lastResolved.confidence)
              setStudentId(lastResolved.id)
              setConfidence(lastResolved.confidence)
              setStatus("speaking")
              return
            }

            update(null, .25)
            setStudentId(null)
            setConfidence(0)
            setStatus("uncertain")
          } catch (reason) {
            consecutiveVisionErrors += 1
            if (consecutiveVisionErrors < 3) return
            close()
            setStudentId(null)
            setConfidence(0)
            setStatus("unavailable")
            setError(reason instanceof Error ? reason.message : "Face tracking stopped unexpectedly.")
          }
        }, SAMPLE_INTERVAL_MS)
      } catch (reason) {
        setStatus("unavailable")
        setError(reason instanceof Error ? reason.message : "Speaker detection failed.")
      }
    }

    void start()
    return () => {
      cancelled = true
      window.clearInterval(timer)
      close()
      void send()
      landmarker?.close()
      context.onstatechange = null
      if (audioContextRef.current === context) audioContextRef.current = null
      void context.close()
      setAudioActive(false)
    }
  }, [activateAudio, bindings, close, enabled, maxFaces, send, stream, update, videoRef])

  return {
    status,
    studentId,
    studentName: studentId ? names[studentId] : null,
    confidence,
    error,
    audioActive,
    activateAudio,
    flush,
  }
}
