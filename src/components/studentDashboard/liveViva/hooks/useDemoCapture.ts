import { useCallback, useEffect, useRef } from 'react'
import type { IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import type { ScreenTrack } from '@/components/agora/components/AgoraRoomView'
import { vivaSessionService } from '@/services/vivaSessionService'
import { computeAverageHash, getHammingDistance } from '../utils/liveVivaUtils'

interface UseDemoCaptureOptions {
  sessionId: string
  enabled: boolean
  audioTrack: IMicrophoneAudioTrack | null
  screenTrack: ScreenTrack
}

const AUDIO_CHUNK_MS = 20_000
const SCREENSHOT_INTERVAL_MS = 4_000
const SLIDE_CHANGE_THRESHOLD = 5

export function useDemoCapture({ sessionId, enabled, audioTrack, screenTrack }: UseDemoCaptureOptions) {
  const presentationStartRef = useRef<number | null>(null)
  const audioSequenceRef = useRef(1)
  const slideSequenceRef = useRef(1)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const audioIntervalRef = useRef<number | null>(null)
  const screenIntervalRef = useRef<number | null>(null)
  const lastSlideHashRef = useRef('')
  const enabledRef = useRef(enabled)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  const stopCapture = useCallback(() => {
    if (audioIntervalRef.current !== null) {
      window.clearInterval(audioIntervalRef.current)
      audioIntervalRef.current = null
    }
    if (screenIntervalRef.current !== null) {
      window.clearInterval(screenIntervalRef.current)
      screenIntervalRef.current = null
    }
    const recorder = audioRecorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    audioRecorderRef.current = null
  }, [])

  useEffect(() => {
    if (!enabled) {
      stopCapture()
      return
    }
    presentationStartRef.current ??= Date.now()
  }, [enabled, stopCapture])

  useEffect(() => {
    if (!enabled || !audioTrack || audioRecorderRef.current) return

    const mediaStream = new MediaStream([audioTrack.getMediaStreamTrack()])
    const recorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' })
    let audioChunks: Blob[] = []
    audioRecorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data)
    }

    recorder.onstop = async () => {
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        audioChunks = []
        const elapsed = presentationStartRef.current
          ? (Date.now() - presentationStartRef.current) / 1000
          : 0
        const sequence = audioSequenceRef.current++
        const formData = new FormData()
        formData.append('audio', audioBlob, `chunk_${sequence}.webm`)
        formData.append('sequence_number', sequence.toString())
        formData.append('start_time', Math.max(0, elapsed - 20).toFixed(2))
        formData.append('end_time', elapsed.toFixed(2))
        try {
          await vivaSessionService.uploadDemoAudio(sessionId, formData)
        } catch {
          // Capture is best-effort; a later chunk can still succeed.
        }
      }

      if (enabledRef.current && audioRecorderRef.current === recorder) recorder.start()
    }

    recorder.start()
    audioIntervalRef.current = window.setInterval(() => {
      if (recorder.state === 'recording') recorder.stop()
    }, AUDIO_CHUNK_MS)

    return () => {
      if (audioIntervalRef.current !== null) {
        window.clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }
      if (recorder.state !== 'inactive') recorder.stop()
      if (audioRecorderRef.current === recorder) audioRecorderRef.current = null
    }
  }, [audioTrack, enabled, sessionId])

  useEffect(() => {
    if (!enabled || !screenTrack) {
      if (screenIntervalRef.current !== null) {
        window.clearInterval(screenIntervalRef.current)
        screenIntervalRef.current = null
      }
      return
    }

    const videoTrack = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack
    const videoElement = document.createElement('video')
    videoElement.srcObject = new MediaStream([videoTrack.getMediaStreamTrack()])
    videoElement.muted = true
    videoElement.playsInline = true
    void videoElement.play().catch(() => undefined)
    lastSlideHashRef.current = ''

    screenIntervalRef.current = window.setInterval(() => {
      if (videoElement.readyState < 2 || videoElement.videoWidth === 0) return

      const canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth || 640
      canvas.height = videoElement.videoHeight || 480
      const context = canvas.getContext('2d')
      if (!context) return
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      const currentHash = computeAverageHash(canvas)
      const distance = lastSlideHashRef.current
        ? getHammingDistance(lastSlideHashRef.current, currentHash)
        : Number.POSITIVE_INFINITY
      if (distance < SLIDE_CHANGE_THRESHOLD) return
      lastSlideHashRef.current = currentHash

      canvas.toBlob(async (blob) => {
        if (!blob || !enabledRef.current) return
        const elapsed = presentationStartRef.current
          ? (Date.now() - presentationStartRef.current) / 1000
          : 0
        const sequence = slideSequenceRef.current++
        const formData = new FormData()
        formData.append('image', blob, `slide_${sequence}.jpg`)
        formData.append('sequence_number', sequence.toString())
        formData.append('timestamp', elapsed.toFixed(2))
        try {
          await vivaSessionService.uploadDemoScreenshot(sessionId, formData)
        } catch {
          // Screenshot capture is advisory and must not interrupt the viva.
        }
      }, 'image/jpeg', 0.8)
    }, SCREENSHOT_INTERVAL_MS)

    return () => {
      if (screenIntervalRef.current !== null) {
        window.clearInterval(screenIntervalRef.current)
        screenIntervalRef.current = null
      }
      videoElement.pause()
      videoElement.srcObject = null
    }
  }, [enabled, screenTrack, sessionId])

  useEffect(() => stopCapture, [stopCapture])

  return { stopCapture }
}
