import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useSpeechDictation,
  type DictationTranscriber,
  type DictationUnavailableReason,
} from '@/hooks/useSpeechDictation'
import { vivaSessionService } from '@/services/vivaSessionService'
import type { VivaTtsStatus } from '@/types/vivaSession'
import {
  FATAL_SPEECH_ERRORS,
  pickVoice,
  type BrowserSpeechRecognition,
  type SpeechRecognitionWindow,
} from '../utils/liveVivaUtils'

/**
 * Answers are transcribed by ElevenLabs Scribe on the server. The browser's
 * own recogniser is kept only as an outage fallback: it is markedly less
 * accurate, but a viva must never stall because a provider is unreachable.
 */
type DictationMode = 'provider' | 'browser'

/** Consecutive provider failures tolerated before dropping to the browser. */
const PROVIDER_ERROR_LIMIT = 2

interface UseVivaSpeechOptions {
  sessionId: string
  questionText: string | null
  questionId: string | null
  audioUrl?: string | null
  ttsStatus: VivaTtsStatus
  canListen: boolean
  onFinalTranscript: (transcript: string) => void
}

export function useVivaSpeech({
  sessionId,
  questionText,
  questionId,
  audioUrl,
  ttsStatus,
  canListen,
  onFinalTranscript,
}: UseVivaSpeechOptions) {
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isBrowserRecording, setIsBrowserRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [micMuted, setMicMutedState] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [recordingTime, setRecordingTime] = useState(0)
  const [dictationMode, setDictationMode] = useState<DictationMode>('provider')

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const providerErrorsRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const micBlockedRef = useRef(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const onFinalTranscriptRef = useRef(onFinalTranscript)

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript
  }, [onFinalTranscript])

  const transcribe = useCallback<DictationTranscriber>(
    (audio, signal) => vivaSessionService.transcribeAnswerAudio(sessionId, audio, signal),
    [sessionId],
  )

  const handleProviderUnavailable = useCallback((reason: DictationUnavailableReason) => {
    if (reason === 'mic-blocked') {
      micBlockedRef.current = true
      setSpeechSupported(false)
      return
    }
    if (reason === 'provider-disabled' || reason === 'unsupported') {
      console.warn(`[VivaSpeech] Falling back to browser dictation (${reason}).`)
      setDictationMode('browser')
      return
    }
    providerErrorsRef.current += 1
    if (providerErrorsRef.current >= PROVIDER_ERROR_LIMIT) {
      console.warn('[VivaSpeech] Scribe kept failing; falling back to browser dictation.')
      setDictationMode('browser')
    }
  }, [])

  const {
    isListening: isProviderRecording,
    isTranscribing,
    audioLevel,
    start: startDictation,
    stop: stopDictation,
    abort: abortDictation,
  } = useSpeechDictation({
    transcribe,
    onFinalTranscript: (text) => {
      providerErrorsRef.current = 0
      onFinalTranscriptRef.current(text)
    },
    onUnavailable: handleProviderUnavailable,
  })

  const isRecording = dictationMode === 'provider' ? isProviderRecording : isBrowserRecording

  const stopBrowserRecognition = useCallback((abort = false) => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (abort) recognition?.abort()
    else recognition?.stop()
    setIsBrowserRecording(false)
    setInterimTranscript('')
  }, [])

  const startBrowserRecognition = useCallback(() => {
    if (recognitionRef.current || micBlockedRef.current) return
    const speechWindow = window as SpeechRecognitionWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setSpeechSupported(false)
      return
    }

    setInterimTranscript('')
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) finalTranscript += transcript
        else interim += transcript
      }
      if (finalTranscript) onFinalTranscriptRef.current(finalTranscript)
      setInterimTranscript(interim.trim())
    }

    const releaseRecognition = () => {
      if (recognitionRef.current !== recognition) return
      recognitionRef.current = null
      setIsBrowserRecording(false)
      setInterimTranscript('')
    }

    recognition.onerror = (event) => {
      if (FATAL_SPEECH_ERRORS.has(event.error ?? '')) {
        micBlockedRef.current = true
        setSpeechSupported(false)
      }
      releaseRecognition()
    }
    recognition.onend = releaseRecognition
    recognitionRef.current = recognition
    recognition.start()
    setIsBrowserRecording(true)
  }, [])

  /**
   * Stops listening and resolves with any speech that had not been folded into
   * the answer yet, so a submit never drops the student's last sentence.
   */
  const stopRecognition = useCallback(async (): Promise<string> => {
    if (dictationMode === 'provider') return stopDictation()
    stopBrowserRecognition()
    return ''
  }, [dictationMode, stopBrowserRecognition, stopDictation])

  const abortRecognition = useCallback(() => {
    abortDictation()
    stopBrowserRecognition(true)
  }, [abortDictation, stopBrowserRecognition])

  /** Ends listening and folds any last transcript into the answer. */
  const finishListening = useCallback(() => {
    void stopRecognition().then((pending) => {
      if (pending) onFinalTranscriptRef.current(pending)
    })
  }, [stopRecognition])

  useEffect(() => {
    voiceRef.current = pickVoice()
    const onVoicesChanged = () => { voiceRef.current = pickVoice() }
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
  }, [])

  useEffect(() => {
    if (!questionText) return

    let disposed = false
    const controller = new AbortController()
    window.speechSynthesis.cancel()
    audioRef.current?.pause()
    audioRef.current = null
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
    setIsSpeaking(true)

    const finishSpeaking = () => {
      if (!disposed) setIsSpeaking(false)
    }

    const speakWithBrowser = (reason = 'normal fallback') => {
      if (disposed) return
      // Stop any existing audio or speech
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      window.speechSynthesis.cancel()

      console.log(`[VivaSpeech] 🗣️ Speaking with browser speechSynthesis (reason: ${reason})`)
      const utterance = new SpeechSynthesisUtterance(questionText)
      utterance.voice = voiceRef.current
      utterance.rate = 0.95
      utterance.pitch = 1
      utterance.onstart = () => {
        if (!disposed) setIsSpeaking(true)
      }
      utterance.onend = finishSpeaking
      utterance.onerror = finishSpeaking
      window.speechSynthesis.speak(utterance)
    }

    const wait = (milliseconds: number) => new Promise<void>((resolve) => {
      window.setTimeout(resolve, milliseconds)
    })

    /** Try to play audio from a URL (signed Azure URL or blob URL). */
    const playFromUrl = (audioUrl: string, source = 'Azure SAS URL'): Promise<boolean> => {
      if (disposed) return Promise.resolve(false)
      return new Promise<boolean>((resolve) => {
        console.log(`[VivaSpeech] 🎵 Attempting audio playback with source: ${source}`)
        const audio = new Audio(audioUrl)
        audioRef.current = audio

        let resolved = false
        const cleanupAndResolve = (success: boolean) => {
          if (resolved) return
          resolved = true
          if (!success) {
            audio.pause()
            if (audioRef.current === audio) {
              audioRef.current = null
            }
          }
          resolve(success)
        }

        audio.onplay = () => {
          // Cancel any browser speech synthesis immediately so voices never overlap
          window.speechSynthesis.cancel()
          console.log('[VivaSpeech] ▶️ Audio playback started')
          cleanupAndResolve(true)
        }

        audio.onended = () => {
          console.log('[VivaSpeech] ⏹️ Audio playback finished')
          finishSpeaking()
        }

        audio.onerror = (e) => {
          console.warn(`[VivaSpeech] ⚠️ Audio error loading source (${source}):`, e)
          cleanupAndResolve(false)
        }

        audio.play().catch((err) => {
          console.warn('[VivaSpeech] ⚠️ audio.play() rejected:', err)
          cleanupAndResolve(false)
        })
      })
    }

    const speakGeneratedAudio = async () => {
      console.log('[VivaSpeech] speakGeneratedAudio triggered:', {
        questionId,
        ttsStatus,
        hasDirectAudioUrl: Boolean(audioUrl),
        questionText: questionText?.slice(0, 40) + '...',
      })

      if (!questionId || ttsStatus === 'disabled' || ttsStatus === 'failed') {
        speakWithBrowser(`ttsStatus is '${ttsStatus}' or questionId missing`)
        return
      }

      // 1. FAST PATH: If the backend already provided an audioUrl directly with the question
      if (audioUrl) {
        console.log('[VivaSpeech] 🚀 Fast Path: Attempting direct pre-signed audioUrl...')
        const played = await playFromUrl(audioUrl, 'Direct question payload SAS URL')
        if (played) return
        if (disposed) return
        console.log('[VivaSpeech] Fast path audio not ready on storage yet; polling /audio/ endpoint...')
      }

      // 2. RETRY LOOP: Polls /audio/ until status is ready or retries expire
      try {
        const delays = [150, 300, 500, 800]
        for (let i = 0; i < delays.length; i += 1) {
          const delayMs = delays[i]
          if (delayMs) await wait(delayMs)
          if (disposed) return
          console.log(`[VivaSpeech] 📡 Requesting question audio (attempt ${i + 1}/${delays.length}, delay ${delayMs}ms)...`)
          const response = await vivaSessionService.getQuestionAudio(
            sessionId,
            questionId,
            controller.signal,
          )
          console.log(`[VivaSpeech] 📥 Response status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`)

          if (response.ok) {
            const contentType = response.headers.get('content-type') || ''

            // Signed URL response (JSON) — browser streams directly from Azure
            if (contentType.includes('application/json')) {
              const data = await response.json()
              if (disposed) return
              console.log('[VivaSpeech] 🌐 Received signed audio JSON payload:', data)
              if (data.audio_url) {
                if (await playFromUrl(data.audio_url, 'Signed Azure URL')) return
                if (disposed) return
              }
            }

            // Legacy proxy fallback (binary audio/mpeg)
            console.log('[VivaSpeech] 📦 Received binary audio stream; converting to Blob URL...')
            const blob = await response.blob()
            if (disposed) return
            const blobUrl = URL.createObjectURL(blob)
            audioUrlRef.current = blobUrl
            if (await playFromUrl(blobUrl, 'Blob URL')) return
            URL.revokeObjectURL(blobUrl)
            audioUrlRef.current = null
            if (disposed) return
          }
          if (response.status !== 202 && response.status !== 200) {
            console.warn(`[VivaSpeech] Response was ${response.status}; stopping retries`)
            break
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          console.log('[VivaSpeech] Request aborted due to question change or component unmount')
          return
        }
        console.warn('[VivaSpeech] Error in speakGeneratedAudio:', err)
      }

      if (!disposed) {
        speakWithBrowser('all audio fetch attempts exhausted')
      }
    }

    void speakGeneratedAudio()
    return () => {
      disposed = true
      controller.abort()
      window.speechSynthesis.cancel()
      audioRef.current?.pause()
      audioRef.current = null
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
      setIsSpeaking(false)
    }
  }, [audioUrl, questionId, questionText, sessionId, ttsStatus])

  useEffect(() => {
    // Releasing the mic the moment the AI speaks matters more with Scribe than
    // it did with the browser recogniser: a live recorder would capture the
    // question audio, transcribe it, and bill it as the student's answer.
    if (!canListen || isSpeaking || micMuted) {
      if (isRecording) finishListening()
      return
    }
    if (isRecording) return
    if (dictationMode === 'provider') void startDictation()
    else startBrowserRecognition()
  }, [
    canListen, dictationMode, finishListening, isRecording, isSpeaking,
    micMuted, startBrowserRecognition, startDictation,
  ])

  // Dropping to the browser recogniser mid-answer must release the recorder
  // first, or two captures fight over the same microphone.
  useEffect(() => {
    if (dictationMode === 'browser') abortDictation()
  }, [abortDictation, dictationMode])
    if (!canListen || isSpeaking || micMuted) {
      if (isRecording) stopRecognition(true)
      return
    }
    if (isRecording) return
    startRecognition()
  }, [
    canListen,
    isRecording,
    isSpeaking,
    micMuted,
    startRecognition,
    stopRecognition,
  ])

  useEffect(() => {
    if (!isRecording) {
      setRecordingTime(0)
      return
    }
    const timer = window.setInterval(() => setRecordingTime((value) => value + 1), 1_000)
    return () => window.clearInterval(timer)
  }, [isRecording])

  useEffect(() => () => {
    recognitionRef.current?.abort()
    window.speechSynthesis.cancel()
    audioRef.current?.pause()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
  }, [])

  // The listening effect reacts to micMuted and stops the capture there, so
  // this only records intent. Muting still finishes the sentence in progress.
  const setMicMuted = useCallback((muted: boolean) => {
    setMicMutedState(muted)
    if (!muted) micBlockedRef.current = false
  }, [])

  const clearInterimTranscript = useCallback(() => setInterimTranscript(''), [])

  return {
    interimTranscript,
    clearInterimTranscript,
    isRecording,
    isTranscribing,
    audioLevel,
    isSpeaking,
    micMuted,
    speechSupported,
    recordingTime,
    setMicMuted,
    stopRecognition,
    abortRecognition,
  }
}
