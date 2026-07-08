'use client'

import { useCallback, useRef } from 'react'

/**
 * Records the viva session from the SAME camera/mic tracks Agora publishes
 * (no second getUserMedia — the browser owns one capture pipeline).
 *
 * start() is fed Agora local tracks; stop() yields a webm File ready for
 * upload to /api/sessions/<id>/cv/recording/.
 */
export function useSessionRecorder(sessionId: string) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const start = useCallback(
    (agoraVideoTrack: unknown, agoraAudioTrack: unknown) => {
      if (recorderRef.current) return // already recording

      const tracks: MediaStreamTrack[] = []
      const v = agoraVideoTrack as { getMediaStreamTrack?: () => MediaStreamTrack } | null
      const a = agoraAudioTrack as { getMediaStreamTrack?: () => MediaStreamTrack } | null
      if (v?.getMediaStreamTrack) tracks.push(v.getMediaStreamTrack())
      if (a?.getMediaStreamTrack) tracks.push(a.getMediaStreamTrack())
      if (tracks.length === 0) return

      const stream = new MediaStream(tracks)
      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm']
        .find((t) => MediaRecorder.isTypeSupported(t))

      try {
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
        chunksRef.current = []
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }
        recorder.start(1000) // 1s chunks so a crash loses little
        recorderRef.current = recorder
      } catch (err) {
        console.warn('Session recording could not start:', err)
      }
    },
    [],
  )

  /** Stop and return the recording as a File (null if nothing recorded). */
  const stop = useCallback((): Promise<File | null> => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      recorderRef.current = null
      return Promise.resolve(null)
    }
    return new Promise((resolve) => {
      recorder.onstop = () => {
        recorderRef.current = null
        const chunks = chunksRef.current
        chunksRef.current = []
        if (chunks.length === 0) return resolve(null)
        const blob = new Blob(chunks, { type: chunks[0].type || 'video/webm' })
        resolve(new File([blob], `session_${sessionId}.webm`, { type: blob.type }))
      }
      recorder.stop()
    })
  }, [sessionId])

  const isRecording = useCallback(
    () => recorderRef.current?.state === 'recording',
    [],
  )

  return { start, stop, isRecording }
}
