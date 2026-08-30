"use client"

import { useCallback, useRef, useState } from "react"
import { physicalEvaluationService } from "@/services/physicalEvaluationService"

const mimeTypeForBrowser = () => [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
].find((type) => MediaRecorder.isTypeSupported(type)) || ""

async function uploadWithRetry(
  sessionId: string,
  index: number,
  chunk: Blob,
  mimeType: string,
) {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await physicalEvaluationService.uploadRecordingChunk(
        sessionId,
        index,
        chunk,
        mimeType,
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
  const uploadChainRef = useRef<Promise<unknown>>(Promise.resolve())
  const stopResolverRef = useRef<(() => void) | null>(null)
  const [recording, setRecording] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const start = useCallback((sessionId: string, stream: MediaStream) => {
    if (recorderRef.current?.state === "recording") return true
    if (typeof MediaRecorder === "undefined") {
      setUploadError("This browser cannot record the physical session.")
      return false
    }
    const mimeType = mimeTypeForBrowser()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    sessionRef.current = sessionId
    startedAtRef.current = Date.now()
    nextChunkRef.current = 0
    uploadChainRef.current = Promise.resolve()
    setUploadError("")
    recorder.ondataavailable = (event) => {
      if (!event.data.size || !sessionRef.current) return
      const index = nextChunkRef.current++
      const targetSession = sessionRef.current
      uploadChainRef.current = uploadChainRef.current.then(() => uploadWithRetry(
        targetSession,
        index,
        event.data,
        recorder.mimeType || "video/webm",
      )).catch((reason) => {
        setUploadError(reason instanceof Error ? reason.message : "A recording chunk failed to upload.")
        throw reason
      })
    }
    recorder.onstop = () => stopResolverRef.current?.()
    recorder.start(10_000)
    recorderRef.current = recorder
    setRecording(true)
    return true
  }, [])

  const stopAndFinalize = useCallback(async (sessionId: string) => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === "inactive") throw new Error("No physical-session recording is active.")
    const stopped = new Promise<void>((resolve) => { stopResolverRef.current = resolve })
    recorder.stop()
    await stopped
    await uploadChainRef.current
    const totalChunks = nextChunkRef.current
    if (!totalChunks) throw new Error("The browser produced no recording data.")
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
    const result = await physicalEvaluationService.finalizeChunkedRecording(
      sessionId,
      totalChunks,
      durationSeconds,
      recorder.mimeType || "video/webm",
    )
    recorderRef.current = null
    sessionRef.current = null
    stopResolverRef.current = null
    setRecording(false)
    return result
  }, [])

  const abandon = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== "inactive") recorder.stop()
    recorderRef.current = null
    sessionRef.current = null
    setRecording(false)
  }, [])

  return { start, stopAndFinalize, abandon, recording, uploadError }
}
