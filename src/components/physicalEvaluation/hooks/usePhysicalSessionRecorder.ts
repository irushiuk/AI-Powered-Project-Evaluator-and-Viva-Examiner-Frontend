"use client"

import { useCallback, useRef, useState } from "react"
import { physicalEvaluationService } from "@/services/physicalEvaluationService"
import type { PhysicalRecordingUpload } from "@/types/physicalEvaluation"

export type RecordingFinalizationStage =
  | "idle"
  | "recording"
  | "stopping"
  | "uploading"
  | "finalizing"
  | "complete"
  | "failed"

type RecordingResumeOptions = {
  nextChunkIndex?: number
  startedAt?: string | number
}

type PendingChunk = { chunk: Blob; mimeType: string }
type UploadQueue = { promise: Promise<void> }

// These promises are deliberately module-scoped. A Next.js route change can
// unmount the kiosk UI without cancelling an accepted recording upload.
const backgroundFinalizations = new Map<string, Promise<PhysicalRecordingUpload>>()
const backgroundRecordingTokens = new Map<string, string>()

const mimeTypeForBrowser = () => [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
].find((type) => MediaRecorder.isTypeSupported(type)) || ""

async function withRequestTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  milliseconds: number,
  timeoutMessage: string,
): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), milliseconds)
  try {
    return await request(controller.signal)
  } catch (error) {
    if (controller.signal.aborted) throw new Error(timeoutMessage, { cause: error })
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}

async function uploadWithRetry(
  sessionId: string,
  index: number,
  chunk: Blob,
  mimeType: string,
) {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await withRequestTimeout(
        (signal) => physicalEvaluationService.uploadRecordingChunk(
          sessionId,
          index,
          chunk,
          mimeType,
          signal,
          backgroundRecordingTokens.get(sessionId),
        ),
        30_000,
        `Recording chunk ${index + 1} timed out.`,
      )
    } catch (error) {
      lastError = error
      if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 1000 * 2 ** attempt))
    }
  }
  throw lastError
}

export function usePhysicalSessionRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const sessionRef = useRef<string | null>(null)
  const startedAtRef = useRef(0)
  const nextChunkRef = useRef(0)
  const uploadQueueRef = useRef<UploadQueue>({ promise: Promise.resolve() })
  const pendingChunksRef = useRef(new Map<number, PendingChunk>())
  const stopResolverRef = useRef<(() => void) | null>(null)
  const [recording, setRecording] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [finalizationStage, setFinalizationStage] =
    useState<RecordingFinalizationStage>("idle")

  const start = useCallback((
    sessionId: string,
    stream: MediaStream,
    resume: RecordingResumeOptions = {},
  ) => {
    if (recorderRef.current?.state === "recording") return true
    if (typeof MediaRecorder === "undefined") {
      setUploadError("This browser cannot record the physical session.")
      return false
    }
    const mimeType = mimeTypeForBrowser()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    sessionRef.current = sessionId
    const resumedStart = typeof resume.startedAt === "string"
      ? new Date(resume.startedAt).getTime()
      : resume.startedAt
    startedAtRef.current = resumedStart && Number.isFinite(resumedStart)
      ? resumedStart
      : Date.now()
    nextChunkRef.current = Math.max(0, resume.nextChunkIndex ?? 0)
    const uploadQueue: UploadQueue = { promise: Promise.resolve() }
    const pendingChunks = new Map<number, PendingChunk>()
    uploadQueueRef.current = uploadQueue
    pendingChunksRef.current = pendingChunks
    setUploadError("")
    setFinalizationStage("recording")
    recorder.ondataavailable = (event) => {
      if (!event.data.size || !sessionRef.current) return
      const index = nextChunkRef.current++
      const targetSession = sessionRef.current
      const chunkData = {
        chunk: event.data,
        mimeType: recorder.mimeType || "video/webm",
      }
      pendingChunks.set(index, chunkData)
      uploadQueue.promise = uploadQueue.promise.then(async () => {
        try {
          // Always flush from the oldest missing index. That keeps backend
          // indices contiguous, so a reload can safely continue at the
          // reported upload count without leaving an unfillable gap.
          for (const [pendingIndex, pending] of [
            ...pendingChunks.entries(),
          ].sort(([left], [right]) => left - right)) {
            await uploadWithRetry(
              targetSession,
              pendingIndex,
              pending.chunk,
              pending.mimeType,
            )
            pendingChunks.delete(pendingIndex)
          }
          setUploadError("")
        } catch (reason) {
          setUploadError(
            reason instanceof Error
              ? reason.message
              : "A recording chunk failed to upload.",
          )
        }
      })
    }
    recorder.onstop = () => stopResolverRef.current?.()
    recorder.start(10_000)
    recorderRef.current = recorder
    setRecording(true)
    return true
  }, [])

  const beginBackgroundFinalization = useCallback(async (sessionId: string) => {
    const recorder = recorderRef.current
    if (!recorder || sessionRef.current !== sessionId) {
      throw new Error("No physical-session recording is available to finalize.")
    }
    try {
      if (recorder.state !== "inactive") {
        setFinalizationStage("stopping")
        const stopped = new Promise<void>((resolve) => {
          stopResolverRef.current = resolve
        })
        recorder.stop()
        await stopped
      }

      setRecording(false)
      setFinalizationStage("uploading")
      const totalChunks = nextChunkRef.current
      if (!totalChunks) throw new Error("The browser produced no recording data.")
      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000),
      )
      const mimeType = recorder.mimeType || "video/webm"
      const pendingChunks = pendingChunksRef.current
      const uploadQueue = uploadQueueRef.current

      // Register expected chunks immediately. This changes the backend run to
      // recording_uploading and releases the kiosk without waiting for every
      // browser-held chunk to finish transferring.
      const accepted = await withRequestTimeout(
        (signal) => physicalEvaluationService.finalizeChunkedRecording(
          sessionId,
          totalChunks,
          durationSeconds,
          mimeType,
          signal,
          true,
        ),
        30_000,
        "Recording finalization request timed out.",
      )
      if (accepted.status === "failed") {
        throw new Error(accepted.error_message || "Recording upload was rejected.")
      }
      if (!accepted.upload_token) {
        throw new Error("The server did not provide a background upload capability.")
      }
      backgroundRecordingTokens.set(sessionId, accepted.upload_token)

      // Detach this capture before starting the next student. All objects used
      // below are session-local, so a new recorder cannot overwrite them.
      recorderRef.current = null
      sessionRef.current = null
      stopResolverRef.current = null
      pendingChunksRef.current = new Map()
      uploadQueueRef.current = { promise: Promise.resolve() }

      const completion = (async () => {
        await uploadQueue.promise
        for (const [index, pending] of [...pendingChunks.entries()].sort(
          ([left], [right]) => left - right,
        )) {
          await uploadWithRetry(sessionId, index, pending.chunk, pending.mimeType)
          pendingChunks.delete(index)
        }
        setUploadError("")

        // Close the race between the final chunk and the initial finalize
        // request. The endpoint is idempotent.
        let result = await withRequestTimeout(
          (signal) => physicalEvaluationService.finalizeChunkedRecording(
            sessionId,
            totalChunks,
            durationSeconds,
            mimeType,
            signal,
            false,
            accepted.upload_token,
          ),
          30_000,
          "Recording finalization request timed out.",
        )
        for (let attempt = 0; result.status !== "ready" && attempt < 30; attempt += 1) {
          if (result.status === "failed") {
            throw new Error(result.error_message || "Recording finalization failed.")
          }
          await new Promise((resolve) => window.setTimeout(resolve, 2000))
          result = await withRequestTimeout(
            (signal) => physicalEvaluationService.getRecordingStatus(
              sessionId,
              signal,
              accepted.upload_token,
            ),
            10_000,
            "Recording status check timed out.",
          )
        }
        if (result.status !== "ready") {
          throw new Error("Recording finalization is taking longer than expected.")
        }
        return result
      })()

      backgroundFinalizations.set(sessionId, completion)
      void completion.then(
        () => {
          backgroundFinalizations.delete(sessionId)
          backgroundRecordingTokens.delete(sessionId)
          setFinalizationStage((current) =>
            current === "uploading" ? "complete" : current,
          )
        },
        (reason: unknown) => {
          backgroundFinalizations.delete(sessionId)
          setUploadError(
            reason instanceof Error
              ? reason.message
              : "The background recording upload failed.",
          )
          setFinalizationStage((current) =>
            current === "uploading" ? "failed" : current,
          )
        },
      )
      return accepted
    } catch (reason) {
      setFinalizationStage("failed")
      throw reason
    }
  }, [])

  const abandon = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== "inactive") recorder.stop()
    recorderRef.current = null
    sessionRef.current = null
    pendingChunksRef.current.clear()
    setRecording(false)
    setFinalizationStage("idle")
  }, [])

  return {
    start,
    beginBackgroundFinalization,
    abandon,
    recording,
    uploadError,
    finalizationStage,
  }
}
