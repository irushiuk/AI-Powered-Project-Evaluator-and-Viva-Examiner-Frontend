'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface DictationTranscription {
  text: string
  stt_status?: string
}

export type DictationTranscriber = (
  audio: Blob,
  signal?: AbortSignal,
) => Promise<DictationTranscription>

export type DictationUnavailableReason =
  | 'unsupported'
  | 'mic-blocked'
  | 'provider-disabled'
  | 'provider-error'

export interface UseSpeechDictationOptions {
  /** Uploads one recorded utterance and resolves with the provider transcript. */
  transcribe: DictationTranscriber
  /** Receives text for each utterance finalised while dictation keeps running. */
  onFinalTranscript: (text: string) => void
  /** Called once the provider or microphone can no longer serve dictation. */
  onUnavailable?: (reason: DictationUnavailableReason) => void
  /** Silence that ends an utterance, in milliseconds. */
  silenceMs?: number
  /** Shortest clip worth sending to the provider. */
  minSpeechMs?: number
  /** Hard cut so one long answer still arrives in transcribable pieces. */
  maxSegmentMs?: number
}

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

/** Ambient noise floors vary per room, so the gate is calibrated, not fixed. */
const CALIBRATION_MS = 500
/** Polling beats requestAnimationFrame here: it keeps running when the
 *  browser throttles animation frames, so an utterance still gets cut. */
const MONITOR_INTERVAL_MS = 60
const MIN_THRESHOLD = 0.012
/** Ceiling on the calibrated gate. Calibration takes the loudest moment of
 *  the first half second, so a teammate talking over the speakers while a
 *  recorder starts would otherwise set a floor the student's own voice never
 *  crosses - the recorder then runs forever without ever cutting a segment,
 *  and nothing reaches the transcriber. Speech sits well above this. */
const MAX_THRESHOLD = 0.06
const FLOOR_MULTIPLIER = 2.5
/** Below this a clip is silence or a clipped recorder start, not speech. */
const MIN_CLIP_BYTES = 1_200

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export function isDictationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}

/**
 * Records the microphone, splits it into utterances on silence, and sends each
 * one to a server-side transcription provider.
 *
 * Segments are cut by stopping and restarting the recorder rather than slicing
 * one stream: only a recorder's first chunk carries container headers, so a
 * sliced blob would not decode on its own.
 */
export function useSpeechDictation({
  transcribe,
  onFinalTranscript,
  onUnavailable,
  silenceMs = 900,
  minSpeechMs = 400,
  maxSegmentMs = 20_000,
}: UseSpeechDictationOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [supported, setSupported] = useState(true)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const monitorTimerRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const startRecorderRef = useRef<(() => void) | null>(null)

  const listeningRef = useRef(false)
  const segmentStartRef = useRef(0)
  const speechStartedRef = useRef(false)
  const lastVoiceAtRef = useRef(0)
  const calibrationUntilRef = useRef(0)
  const noiseFloorRef = useRef(0)
  const cuttingRef = useRef(false)
  const inFlightRef = useRef(new Set<Promise<string>>())

  // Whoever is collecting right now: the caller during a stop, the consumer
  // otherwise. Swapping this is what keeps the final utterance out of the
  // answer box while it is being folded into the submission.
  const sinkRef = useRef<(text: string) => void>(() => undefined)
  const onFinalRef = useRef(onFinalTranscript)
  const onUnavailableRef = useRef(onUnavailable)
  const transcribeRef = useRef(transcribe)

  useEffect(() => {
    onFinalRef.current = onFinalTranscript
    onUnavailableRef.current = onUnavailable
    transcribeRef.current = transcribe
  }, [onFinalTranscript, onUnavailable, transcribe])

  useEffect(() => {
    sinkRef.current = (text: string) => onFinalRef.current(text)
  }, [])

  useEffect(() => {
    setSupported(isDictationSupported())
  }, [])

  const releaseAudioGraph = useCallback(() => {
    if (monitorTimerRef.current !== null) {
      window.clearInterval(monitorTimerRef.current)
      monitorTimerRef.current = null
    }
    analyserRef.current = null
    const context = audioContextRef.current
    audioContextRef.current = null
    if (context && context.state !== 'closed') {
      void context.close().catch(() => undefined)
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setAudioLevel(0)
  }, [])

  const sendSegment = useCallback((blob: Blob) => {
    if (blob.size < MIN_CLIP_BYTES) return
    setIsTranscribing(true)
    const controller = abortRef.current
    const job = transcribeRef.current(blob, controller?.signal)
      .then((result) => {
        if (result.stt_status === 'disabled') {
          onUnavailableRef.current?.('provider-disabled')
          return ''
        }
        return (result.text || '').trim()
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return ''
        console.warn('[Dictation] Transcription request failed:', error)
        onUnavailableRef.current?.('provider-error')
        return ''
      })

    inFlightRef.current.add(job)
    void job.then((text) => {
      inFlightRef.current.delete(job)
      if (inFlightRef.current.size === 0) setIsTranscribing(false)
      if (text) sinkRef.current(text)
    })
  }, [])

  const startRecorder = useCallback(() => {
    const stream = streamRef.current
    if (!stream || recorderRef.current) return
    const mimeType = pickMimeType()
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    } catch (error) {
      console.warn('[Dictation] MediaRecorder could not start:', error)
      setSupported(false)
      onUnavailableRef.current?.('unsupported')
      return
    }

    chunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const parts = chunksRef.current
      chunksRef.current = []
      if (parts.length === 0) return
      sendSegment(new Blob(parts, { type: parts[0].type || mimeType || 'audio/webm' }))
    }

    recorderRef.current = recorder
    segmentStartRef.current = performance.now()
    speechStartedRef.current = false
    lastVoiceAtRef.current = 0
    recorder.start()
  }, [sendSegment])

  useEffect(() => {
    startRecorderRef.current = startRecorder
  }, [startRecorder])

  /**
   * Ends the current utterance; a new recorder starts if we are still live.
   * Resolves once the recorder's own stop handler has queued the clip, so a
   * caller waiting to submit knows the last segment is accounted for.
   */
  const cutSegment = useCallback((resume: boolean): Promise<void> => {
    const recorder = recorderRef.current
    if (!recorder || cuttingRef.current) return Promise.resolve()
    cuttingRef.current = true
    recorderRef.current = null

    return new Promise<void>((resolve) => {
      const startNext = () => {
        cuttingRef.current = false
        if (resume && listeningRef.current && streamRef.current) {
          startRecorderRef.current?.()
        }
        resolve()
      }

      if (recorder.state === 'inactive') {
        startNext()
        return
      }
      // The recorder's own onstop runs first and queues the clip, because it
      // was registered before this listener.
      recorder.addEventListener('stop', startNext, { once: true })
      try {
        recorder.stop()
      } catch {
        startNext()
      }
    })
  }, [])

  const monitor = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser || !listeningRef.current) return

    const samples = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(samples)
    let sumSquares = 0
    for (let index = 0; index < samples.length; index += 1) {
      const centred = (samples[index] - 128) / 128
      sumSquares += centred * centred
    }
    const rms = Math.sqrt(sumSquares / samples.length)
    setAudioLevel(rms)

    const now = performance.now()
    if (now < calibrationUntilRef.current) {
      noiseFloorRef.current = Math.max(noiseFloorRef.current, rms)
    } else {
      const threshold = Math.min(
        MAX_THRESHOLD,
        Math.max(MIN_THRESHOLD, noiseFloorRef.current * FLOOR_MULTIPLIER),
      )
      if (rms > threshold) {
        speechStartedRef.current = true
        lastVoiceAtRef.current = now
      }

      const spoken = now - segmentStartRef.current
      const silentFor = lastVoiceAtRef.current ? now - lastVoiceAtRef.current : 0
      if (
        speechStartedRef.current &&
        ((silentFor >= silenceMs && spoken >= minSpeechMs) || spoken >= maxSegmentMs)
      ) {
        void cutSegment(true)
      }
    }

  }, [cutSegment, maxSegmentMs, minSpeechMs, silenceMs])

  const start = useCallback(async () => {
    if (listeningRef.current) return
    if (!isDictationSupported()) {
      setSupported(false)
      onUnavailableRef.current?.('unsupported')
      return
    }

    // Claim the session before awaiting the permission prompt, so an effect
    // that re-runs while the prompt is open cannot open a second microphone.
    listeningRef.current = true

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (error) {
      listeningRef.current = false
      console.warn('[Dictation] Microphone unavailable:', error)
      setSupported(false)
      onUnavailableRef.current?.('mic-blocked')
      return
    }

    if (!listeningRef.current) {
      // Aborted while the permission prompt was open.
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    streamRef.current = stream
    abortRef.current = new AbortController()

    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (AudioContextCtor) {
      const context = new AudioContextCtor()
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.6
      context.createMediaStreamSource(stream).connect(analyser)
      audioContextRef.current = context
      analyserRef.current = analyser
    }

    noiseFloorRef.current = 0
    calibrationUntilRef.current = performance.now() + CALIBRATION_MS
    setIsListening(true)
    startRecorder()
    if (analyserRef.current) {
      monitorTimerRef.current = window.setInterval(monitor, MONITOR_INTERVAL_MS)
    }
  }, [monitor, startRecorder])

  /**
   * Stops dictation and resolves with any text still owed, so a caller that is
   * about to submit never loses the last utterance.
   */
  const stop = useCallback(async (): Promise<string> => {
    if (!listeningRef.current) return ''
    listeningRef.current = false
    setIsListening(false)

    const collected: string[] = []
    const previousSink = sinkRef.current
    sinkRef.current = (text: string) => {
      collected.push(text)
    }

    await cutSegment(false)
    // A clip queued during the wait must be awaited too, not just the first batch.
    while (inFlightRef.current.size > 0) {
      await Promise.all([...inFlightRef.current])
    }

    sinkRef.current = previousSink
    releaseAudioGraph()
    setIsTranscribing(false)
    return collected.join(' ').trim()
  }, [cutSegment, releaseAudioGraph])

  /** Drops the microphone without waiting for any transcript in flight. */
  const abort = useCallback(() => {
    listeningRef.current = false
    setIsListening(false)
    abortRef.current?.abort()
    abortRef.current = null
    const recorder = recorderRef.current
    recorderRef.current = null
    chunksRef.current = []
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      try {
        recorder.stop()
      } catch {
        // The browser had already torn the recorder down.
      }
    }
    inFlightRef.current.clear()
    setIsTranscribing(false)
    releaseAudioGraph()
  }, [releaseAudioGraph])

  useEffect(() => () => abort(), [abort])

  return { isListening, isTranscribing, audioLevel, supported, start, stop, abort }
}
