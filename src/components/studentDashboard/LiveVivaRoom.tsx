'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageSquareText,
  Mic,
  MicOff,
  Monitor,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { vivaSessionService } from '@/services/vivaSessionService'
import type {
  BloomsLevel,
  SessionPhase,
  SubmitVivaAnswerResponse,
  VivaDifficulty,
  VivaQuestion,
} from '@/types/vivaSession'
import { toast } from 'sonner'
import AgoraVideoRoom from '@/components/agora/AgoraVideoRoom'
import { cvAnalysisService } from '@/services/cvAnalysisService'
import { liveQuestionService, type LiveQuestion } from '@/services/liveQuestionService'
import { useSessionRecorder } from '@/hooks/useSessionRecorder'

const SKIP_ANSWER_TEXT = 'Student skipped this question.'

function computeAverageHash(canvas: HTMLCanvasElement): string {
  const tinyCanvas = document.createElement('canvas')
  tinyCanvas.width = 8
  tinyCanvas.height = 8
  const ctx = tinyCanvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(canvas, 0, 0, 8, 8)
  const imgData = ctx.getImageData(0, 0, 8, 8)
  const data = imgData.data
  
  let total = 0
  const gray: number[] = []
  for (let i = 0; i < 64; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const avg = (r + g + b) / 3
    gray.push(avg)
    total += avg
  }
  const average = total / 64
  let hash = ''
  for (let i = 0; i < 64; i++) {
    hash += gray[i] >= average ? '1' : '0'
  }
  return hash
}

function getHammingDistance(h1: string, h2: string): number {
  let dist = 0
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) dist++
  }
  return dist
}


type SpeechRecognitionAlternativeLike = {
  transcript: string
}

type SpeechRecognitionResultLike = {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

type SpeechRecognitionResultListLike = {
  length: number
  [index: number]: SpeechRecognitionResultLike
}

type SpeechRecognitionEventLike = Event & {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

type SpeechRecognitionErrorEventLike = Event & {
  error?: string
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }

function getCachedQuestion(sessionId: string): VivaQuestion | null {
  try {
    const value = window.sessionStorage.getItem(`live-viva-question:${sessionId}`)
    return value ? (JSON.parse(value) as VivaQuestion) : null
  } catch {
    return null
  }
}

function setCachedQuestion(sessionId: string, question: VivaQuestion) {
  try {
    window.sessionStorage.setItem(`live-viva-question:${sessionId}`, JSON.stringify(question))
  } catch {
    // Session storage is only a duplicate-start guard; the viva can continue without it.
  }
}

function clearCachedQuestion(sessionId: string) {
  try {
    window.sessionStorage.removeItem(`live-viva-question:${sessionId}`)
  } catch {
    // Ignore storage failures.
  }
}

function normalizeQuestion(data: Partial<VivaQuestion>): VivaQuestion | null {
  if (!data.question_id || !data.question_text) return null

  return {
    question_id: data.question_id,
    question_text: data.question_text,
    blooms_level: (data.blooms_level ?? 'Understand') as BloomsLevel,
    difficulty: (data.difficulty ?? 'medium') as VivaDifficulty,
    criterion: data.criterion ?? 'General',
    question_number: data.question_number ?? 1,
  }
}

function appendTranscript(previous: string, next: string) {
  const cleanNext = next.trim()
  if (!cleanNext) return previous
  if (!previous.trim()) return cleanNext
  return `${previous.trim()} ${cleanNext}`
}

export function LiveVivaRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState<VivaQuestion | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [lastFeedback, setLastFeedback] = useState<Pick<
    SubmitVivaAnswerResponse,
    'score' | 'reasoning' | 'strengths' | 'gaps'
  > | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hasFinished, setHasFinished] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showQAPanel, setShowQAPanel] = useState(true)
  // A live question typed by the examiner takes priority over the AI flow;
  // the current AI question stays parked until this is answered.
  const [examinerQuestion, setExaminerQuestion] = useState<LiveQuestion | null>(null)
  const seenExaminerQuestionsRef = useRef<Set<string>>(new Set())
  // Explicit, button-driven session lifecycle (no clock-based transitions):
  //   'checking'         → fetching the current phase
  //   'scheduled'        → lobby; student clicks Start Demo / Start Viva
  //   'demo_in_progress' → students present (screen share); no AI yet
  //   'viva_in_progress' → AI viva is running
  //   'completed'        → handled via hasFinished
  // The examiner sets whether a demo exists (demo_enabled) at scheduling.
  const [phase, setPhase] = useState<SessionPhase | 'checking'>('checking')
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [startingSession, setStartingSession] = useState(false)
  // True when THIS student is the one sharing their screen — only the presenter
  // sees the "End Demo & Start Viva" button.
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [screenTrack, setScreenTrack] = useState<any>(null)
  const [demoAudioTrack, setDemoAudioTrack] = useState<any>(null)

  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const startRequestRef = useRef(false)
  const mountedRef = useRef(false)

  const presentationStartRef = useRef<number | null>(null)
  const audioSequenceRef = useRef<number>(1)
  const slideSequenceRef = useRef<number>(1)
  const screenIntervalRef = useRef<number | null>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const audioIntervalRef = useRef<number | null>(null)
  const lastSlideHashRef = useRef<string>('')

  // Session recording: same camera/mic tracks Agora publishes; uploaded at
  // session end for the examiner's post-hoc behavioral report.
  const sessionRecorder = useSessionRecorder(sessionId)

  const handleLocalTracks = useCallback(
    (videoTrack: unknown, audioTrack: unknown) => {
      sessionRecorder.start(videoTrack, audioTrack)
      setDemoAudioTrack(audioTrack)
    },
    [sessionRecorder],
  )

  const uploadSessionRecording = useCallback(async () => {
    try {
      const file = await sessionRecorder.stop()
      if (!file) return
      toast.info('Uploading session recording…')
      await cvAnalysisService.uploadRecording(sessionId, file)
      toast.success('Session recording uploaded.')
    } catch (err) {
      console.warn('Session recording upload failed:', err)
      toast.error('Could not upload the session recording.')
    }
  }, [sessionRecorder, sessionId])

  const loadFirstQuestion = useCallback(async () => {
    if (startRequestRef.current) return
    startRequestRef.current = true
    setIsLoading(true)
    setLoadError(null)

    const cachedQuestion = getCachedQuestion(sessionId)
    if (cachedQuestion) {
      setCurrentQuestion(cachedQuestion)
      setIsLoading(false)
      startRequestRef.current = false
      return
    }

    try {
      const response = await vivaSessionService.startSession(sessionId)
      console.log('DEBUG: startSession response:', response)
      const question = normalizeQuestion(response)

      if (!question) {
        throw new Error('The backend did not return a viva question.')
      }

      if (!mountedRef.current) return
      setCurrentQuestion(question)
      setCachedQuestion(sessionId, question)
    } catch (error) {
      if (!mountedRef.current) return
      setLoadError(error instanceof Error ? error.message : 'Failed to start viva session')
    } finally {
      startRequestRef.current = false
      if (mountedRef.current) setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    mountedRef.current = true

    // Read the current phase and let the student drive the transitions.
    //   • resume (question already cached) → straight to the viva
    //   • otherwise adopt the server phase (scheduled lobby / demo / viva)
    // A status hiccup falls back to a scheduled lobby so nothing is blocked.
    ;(async () => {
      if (getCachedQuestion(sessionId)) {
        setPhase('viva_in_progress')
        loadFirstQuestion()
        return
      }
      try {
        const status = await vivaSessionService.getSessionStatus(sessionId)
        if (!mountedRef.current) return
        setDemoEnabled(status.demo_enabled)
        setPhase(status.phase)
        if (status.phase === 'viva_in_progress' || status.phase === 'completed') {
          loadFirstQuestion()
        } else {
          setIsLoading(false)
        }
      } catch {
        if (!mountedRef.current) return
        setPhase('scheduled')
        setIsLoading(false)
      }
    })()

    return () => {
      mountedRef.current = false
      window.speechSynthesis.cancel()
      recognitionRef.current?.abort()
    }
  }, [loadFirstQuestion, sessionId])

  // Presence heartbeat ping loop
  useEffect(() => {
    if (hasFinished) return
    const sendPing = async () => {
      try {
        await vivaSessionService.sendPresencePing(sessionId)
      } catch {
        // ignore transient errors
      }
    }
    sendPing() // initial send
    const id = setInterval(sendPing, 10000)
    return () => clearInterval(id)
  }, [sessionId, hasFinished])

  // While in the lobby or demo, poll the phase so a group member's screen
  // follows when a teammate starts the demo, or ends it and the viva begins.
  useEffect(() => {
    if (
      phase !== 'scheduled' &&
      phase !== 'ongoing' &&
      phase !== 'live' &&
      phase !== 'demo_in_progress'
    )
      return
    const id = window.setInterval(async () => {
      try {
        const status = await vivaSessionService.getSessionStatus(sessionId)
        if (!mountedRef.current) return
        if (status.phase === 'viva_in_progress' || status.phase === 'completed') {
          window.clearInterval(id)
          setPhase('viva_in_progress')
          setIsLoading(true)
          loadFirstQuestion()
        } else if (status.phase !== phase) {
          setPhase(status.phase)
        }
      } catch {
        // transient; next tick retries
      }
    }, 5000)
    return () => window.clearInterval(id)
  }, [phase, sessionId, loadFirstQuestion])

  // Trigger warmup when demo starts locally or when synced
  useEffect(() => {
    if (phase === 'demo_in_progress') {
      vivaSessionService.startWarmup(sessionId).catch((err) => {
        console.warn('Warmup trigger failed:', err)
      })
    }
  }, [phase, sessionId])

  // Start presentation capture loop (audio chunks + slide screenshots)
  useEffect(() => {
    console.log('DEBUG LiveVivaRoom: presentation useEffect triggered. screenTrack:', screenTrack, 'phase:', phase, 'demoAudioTrack:', demoAudioTrack)
    if (phase !== 'demo_in_progress') {
      // Clean up loops
      if (screenIntervalRef.current) {
        window.clearInterval(screenIntervalRef.current)
        screenIntervalRef.current = null
      }
      if (audioIntervalRef.current) {
        window.clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }
      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        audioRecorderRef.current.stop()
      }
      return
    }

    if (!presentationStartRef.current) {
      presentationStartRef.current = Date.now()
    }

    // ─── 1. AUDIO CHUNKING RECORDER ───
    if (demoAudioTrack && !audioRecorderRef.current) {
      try {
        const mediaStreamTrack = demoAudioTrack.getMediaStreamTrack()
        const mediaStream = new MediaStream([mediaStreamTrack])
        
        let audioChunks: Blob[] = []
        const recorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' })
        audioRecorderRef.current = recorder

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunks.push(e.data)
          }
        }

        recorder.onstop = async () => {
          if (audioChunks.length === 0) return
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
          audioChunks = [] // reset

          const elapsed = presentationStartRef.current ? (Date.now() - presentationStartRef.current) / 1000 : 0
          const duration = 20
          const start = Math.max(0, elapsed - duration)
          const end = elapsed

          const seq = audioSequenceRef.current
          audioSequenceRef.current += 1

          const formData = new FormData()
          formData.append('audio', audioBlob, `chunk_${seq}.webm`)
          formData.append('sequence_number', seq.toString())
          formData.append('start_time', start.toFixed(2))
          formData.append('end_time', end.toFixed(2))

          try {
            await vivaSessionService.uploadDemoAudio(sessionId, formData)
          } catch (err) {
            console.warn('Audio chunk upload failed:', err)
          }

          // Restart recording for next chunk if still in demo phase
          if (phase === 'demo_in_progress' && audioRecorderRef.current && audioRecorderRef.current.state === 'inactive') {
            audioRecorderRef.current.start()
          }
        }

        // Start initial chunk
        recorder.start()

        // Periodically stop and restart the recorder every 20 seconds to send chunks
        audioIntervalRef.current = window.setInterval(() => {
          if (recorder.state === 'recording') {
            recorder.stop()
          }
        }, 20000)

      } catch (err) {
        console.error('Failed to initialize demo audio recorder:', err)
      }
    }

    // ─── 2. SCREENSHOT CAPTURING LOOP ───
    if (screenTrack) {
      console.log('DEBUG: screenTrack detected:', screenTrack)
      try {
        const videoTrack = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack
        console.log('DEBUG: resolved videoTrack:', videoTrack)
        const mediaStreamTrack = videoTrack.getMediaStreamTrack()
        console.log('DEBUG: mediaStreamTrack:', mediaStreamTrack)
        const videoElement = document.createElement('video')
        videoElement.srcObject = new MediaStream([mediaStreamTrack])
        videoElement.muted = true
        videoElement.playsInline = true
        videoElement.play()
          .then(() => console.log('DEBUG: videoElement started playing successfully.'))
          .catch(e => console.warn('Video play failed:', e))

        // Reset hash baseline on track changes
        lastSlideHashRef.current = ''
        console.log('DEBUG: Reset lastSlideHashRef to empty string')

        screenIntervalRef.current = window.setInterval(() => {
          if (videoElement.readyState < 2 && videoElement.videoWidth === 0) {
            console.log(`DEBUG: tick skipped - readyState: ${videoElement.readyState}, videoWidth: ${videoElement.videoWidth}`)
            return // Wait for video frame to load
          }

          console.log(`DEBUG: tick processing - readyState: ${videoElement.readyState}, videoWidth: ${videoElement.videoWidth}, videoHeight: ${videoElement.videoHeight}`)

          const canvas = document.createElement('canvas')
          canvas.width = videoElement.videoWidth || 640
          canvas.height = videoElement.videoHeight || 480
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            console.log('DEBUG: failed to get 2d context from canvas')
            return
          }
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

          // Perform average hash check
          const currentHash = computeAverageHash(canvas)
          const distance = lastSlideHashRef.current ? getHammingDistance(lastSlideHashRef.current, currentHash) : 99
          console.log(`DEBUG: hash computed. current: ${currentHash}, last: ${lastSlideHashRef.current || 'NONE'}, distance: ${distance}`)

          // If visual change is detected (Hamming distance >= 5 or first frame)
          if (distance >= 5) {
            console.log(`DEBUG: distance ${distance} >= 5, recording new slide state`)
            lastSlideHashRef.current = currentHash

            canvas.toBlob(async (blob) => {
              if (!blob) {
                console.log('DEBUG: canvas.toBlob returned null blob!')
                return
              }

              const elapsed = presentationStartRef.current ? (Date.now() - presentationStartRef.current) / 1000 : 0
              const seq = slideSequenceRef.current
              slideSequenceRef.current += 1

              console.log(`DEBUG: preparing to upload slide. seq: ${seq}, elapsed: ${elapsed}s, size: ${blob.size} bytes`)

              const formData = new FormData()
              formData.append('image', blob, `slide_${seq}.jpg`)
              formData.append('sequence_number', seq.toString())
              formData.append('timestamp', elapsed.toFixed(2))

              try {
                const response = await vivaSessionService.uploadDemoScreenshot(sessionId, formData)
                console.log(`DEBUG: uploadDemoScreenshot succeeded for seq ${seq}:`, response)
              } catch (err) {
                console.error(`DEBUG: uploadDemoScreenshot failed for seq ${seq}:`, err)
              }
            }, 'image/jpeg', 0.8) // Compress as JPEG with 80% quality
          } else {
            console.log(`DEBUG: distance ${distance} < 5, skipping screenshot upload`)
          }
        }, 4000)

      } catch (err) {
        console.error('Failed to initialize screenshot capture loop:', err)
      }
    } else {
      console.log('DEBUG: screenTrack is null or falsy, stopping screenshot capture loop if running')
      // Screen share stopped
      if (screenIntervalRef.current) {
        window.clearInterval(screenIntervalRef.current)
        screenIntervalRef.current = null
      }
    }

    return () => {
      console.log('DEBUG LiveVivaRoom: presentation useEffect cleanup running. screenTrack:', screenTrack)
      if (screenIntervalRef.current) window.clearInterval(screenIntervalRef.current)
      if (audioIntervalRef.current) window.clearInterval(audioIntervalRef.current)
    }
  }, [phase, screenTrack, demoAudioTrack, sessionId])

  useEffect(() => {
    if (hasFinished) return
    // The examiner's live question takes priority over the AI question.
    const text = examinerQuestion?.question_text ?? currentQuestion?.question_text
    if (!text) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)

    // Auto-open Q&A panel when a new question arrives
    setShowQAPanel(true)

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [currentQuestion, examinerQuestion, hasFinished])

  // Poll for examiner-interjected questions while the viva is running.
  useEffect(() => {
    if (isLoading || hasFinished || phase !== 'viva_in_progress') return
    const id = window.setInterval(async () => {
      try {
        const pending = await liveQuestionService.pending(sessionId)
        if (
          pending &&
          !seenExaminerQuestionsRef.current.has(pending.question_id)
        ) {
          seenExaminerQuestionsRef.current.add(pending.question_id)
          setExaminerQuestion(pending)
          toast.info('The examiner has asked you a question.', {
            duration: 6000,
          })
        }
      } catch {
        // transient poll failures are fine; next tick retries
      }
    }, 4000)
    return () => window.clearInterval(id)
  }, [sessionId, isLoading, hasFinished, phase])

  // Group sync: poll the latest AI question so a member's screen advances
  // when a teammate answers. Harmless in individual mode (id won't change
  // underneath). Never overrides an active examiner question or an in-flight
  // submission.
  useEffect(() => {
    if (isLoading || hasFinished || phase !== 'viva_in_progress') return
    const id = window.setInterval(async () => {
      if (isSubmitting || examinerQuestion) return
      try {
        const { question, session_complete } =
          await vivaSessionService.getCurrentQuestion(sessionId)
        if (!mountedRef.current) return
        if (session_complete) {
          setHasFinished(true)
          return
        }
        const next = question ? normalizeQuestion(question) : null
        if (
          next &&
          next.question_id !== currentQuestion?.question_id
        ) {
          setCurrentQuestion(next)
          setCachedQuestion(sessionId, next)
          setAnswerText('')
          setInterimTranscript('')
          setLastFeedback(null)
          toast.info('Your teammate answered — moving to the next question.')
        }
      } catch {
        // transient; next tick retries
      }
    }, 4000)
    return () => window.clearInterval(id)
  }, [
    sessionId, isLoading, hasFinished, phase, isSubmitting,
    examinerQuestion, currentQuestion?.question_id,
  ])

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setRecordingTime(0)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const stopRecognition = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsRecording(false)
    setInterimTranscript('')
  }

  const handleRetry = () => {
    startRequestRef.current = false
    loadFirstQuestion()
  }

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecognition()
      return
    }

    const speechWindow = window as SpeechRecognitionWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

    if (!Recognition) {
      setSpeechSupported(false)
      return
    }

    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setInterimTranscript('')

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''

        if (result.isFinal) {
          finalTranscript += transcript
        } else {
          interim += transcript
        }
      }

      if (finalTranscript) {
        setAnswerText((previous) => appendTranscript(previous, finalTranscript))
      }
      setInterimTranscript(interim.trim())
    }

    recognition.onerror = (event) => {
      setIsRecording(false)
      setInterimTranscript('')
    }

    recognition.onend = () => {
      setIsRecording(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  // Called by Agora mic button — starts recording when unmuted, stops when muted
  const handleMicToggle = (isMuted: boolean) => {
    if (isMuted) {
      // Mic turned OFF → stop recording
      if (isRecording) {
        stopRecognition()
        toast('Mic muted — recording stopped.', { icon: <MicOff className="h-4 w-4 text-slate-400" /> })
      }
    } else {
      // Mic turned ON → start recording automatically
      handleRecordingToggle()
      toast('Mic on — speak your answer.', { icon: <Mic className="h-4 w-4 text-green-500" /> })
    }
  }

  const submitAnswer = async (rawAnswer: string) => {
    if (!currentQuestion && !examinerQuestion) return

    const answer = rawAnswer.trim()
    if (!answer) {
      toast.error('Please speak or type an answer before submitting.')
      return
    }

    if (isRecording) stopRecognition()

    // An active examiner question intercepts the submit: the answer goes to
    // the examiner, then the parked AI flow resumes.
    if (examinerQuestion) {
      setIsSubmitting(true)
      try {
        await liveQuestionService.answer(
          sessionId,
          examinerQuestion.question_id,
          answer,
        )
        setExaminerQuestion(null)
        setAnswerText('')
        setInterimTranscript('')
        toast.success('Answer sent to the examiner.')
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to send the answer',
        )
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (!currentQuestion) return
    setIsSubmitting(true)

    try {
      const response = await vivaSessionService.submitAnswer(
        sessionId,
        currentQuestion.question_id,
        answer,
      )

      setLastFeedback({
        score: response.score,
        reasoning: response.reasoning,
        strengths: response.strengths,
        gaps: response.gaps,
      })

      if (response.session_complete) {
        clearCachedQuestion(sessionId)
        setHasFinished(true)
        toast.success('Viva session completed successfully.')
        // Upload the recording before leaving so the examiner's behavioral
        // report can be generated from it.
        void uploadSessionRecording().finally(() => {
          window.setTimeout(() => router.push('/dashboard/student/sessions'), 2200)
        })
        return
      }

      const nextQuestion = response.next_question ? normalizeQuestion(response.next_question) : null

      if (!nextQuestion) {
        throw new Error('The backend did not return the next viva question.')
      }

      setCurrentQuestion(nextQuestion)
      setCachedQuestion(sessionId, nextQuestion)
      setAnswerText('')
      setInterimTranscript('')
      toast.success('Answer submitted. Next question is ready.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit answer')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    toast('Submitting this question as skipped.', { icon: <SkipForward className="h-4 w-4" /> })
    submitAnswer(SKIP_ANSWER_TEXT)
  }

  // Student clicked "Start Demo" → session moves to the demo phase for everyone.
  const handleStartDemo = async () => {
    if (startingSession) return
    setStartingSession(true)
    try {
      await vivaSessionService.startDemo(sessionId)
      setPhase('demo_in_progress')
      toast.success('Demo started — present your work.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start the demo')
    } finally {
      setStartingSession(false)
    }
  }

  // Student clicked "Start Viva" (no demo) → straight into the AI viva.
  const handleStartViva = async () => {
    if (startingSession) return
    setStartingSession(true)
    try {
      await vivaSessionService.startViva(sessionId)
      setPhase('viva_in_progress')
      setIsLoading(true)
      loadFirstQuestion()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start the viva')
    } finally {
      setStartingSession(false)
    }
  }

  // Presenting student clicked "End Demo & Start Viva". Tell the backend so
  // every participant (and the examiner) advances; the poll then starts the
  // viva. We also transition locally so it feels instant.
  const [endingDemo, setEndingDemo] = useState(false)
  const handleEndDemo = async () => {
    if (endingDemo) return
    setEndingDemo(true)
    try {
      // 1. Stop local loops immediately
      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        audioRecorderRef.current.stop()
      }
      if (screenIntervalRef.current) {
        window.clearInterval(screenIntervalRef.current)
        screenIntervalRef.current = null
      }
      if (audioIntervalRef.current) {
        window.clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }

      // 2. Call backend to mark demo phase as ended
      await vivaSessionService.endDemo(sessionId)
      
      // 3. Poll the queue until everything is processed (drained)
      toast.info('Analyzing presentation talking points and slides. Please wait...')
      
      let attempts = 0
      while (attempts < 60) { // Poll up to 2 minutes max
        const status = await vivaSessionService.getDemoQueueStatus(sessionId)
        if (status.drained) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 2000))
        attempts++
      }

      toast.success('Demo finished — your viva is starting.')
      setPhase('viva_in_progress')
      setIsLoading(true)
      loadFirstQuestion()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to end the demo')
    } finally {
      setEndingDemo(false)
    }
  }

  // ─── Full-screen loading state ────────────────────────────────────
  if (isLoading) {
    const isGeneratingQuestion = phase === 'viva_in_progress'
    return (
      <div className="flex items-center justify-center h-full bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <h2 className="text-2xl font-bold">
            {isGeneratingQuestion ? 'Starting Viva Session' : 'Connecting to Room'}
          </h2>
          <p className="text-slate-400">
            {isGeneratingQuestion 
              ? 'Generating your first question from the evaluation rubric.' 
              : 'Retrieving session details and setting up your media stream...'}
          </p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950 text-white">
        <div className="text-center space-y-5 max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="text-2xl font-bold">Could Not Start Session</h2>
          <p className="text-slate-400">{loadError}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleRetry}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  if (hasFinished) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950 text-white">
        <div className="text-center space-y-6">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold">Session Complete</h2>
          <p className="text-slate-400">Your answers were submitted. Redirecting you back to your sessions.</p>
        </div>
      </div>
    )
  }

  // ─── Lobby: session scheduled / ongoing / live ───
  // The students join the Agora room and can see/talk to each other.
  // The control panel is loaded as a sidebar letting anyone start.
  if (phase === 'scheduled' || phase === 'ongoing' || phase === 'live') {
    return (
      <div className="relative h-full w-full flex bg-slate-950">
        <div className="flex-1 relative">
          <AgoraVideoRoom
            sessionId={sessionId}
            className="rounded-none border-0"
            onLocalTracks={handleLocalTracks}
            remoteJoinNotice="Examiner joining now"
          />
        </div>
        
        {/* Side control panel */}
        <div className="w-[360px] border-l border-slate-800/80 bg-slate-900/95 p-6 flex flex-col justify-center space-y-6 text-slate-100 z-30 shadow-2xl">
          <div className="text-center space-y-3">
            <Monitor className="mx-auto h-12 w-12 text-blue-400 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-100">Lobby Room</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {phase === 'ongoing'
                ? 'Scheduled time has arrived. Waiting for participants to join...'
                : 'At least one student is active in the room. You can start the evaluation below.'}
            </p>
          </div>
          
          <div className="space-y-3">
            {demoEnabled ? (
              <Button
                onClick={handleStartDemo}
                disabled={startingSession}
                className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-700 h-11"
              >
                {startingSession ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting Demo...</>
                ) : (
                  <><Monitor className="mr-2 h-5 w-5" /> Start Demo</>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleStartViva}
                disabled={startingSession}
                className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-700 h-11"
              >
                {startingSession ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting...</>
                ) : (
                  <><ChevronRight className="mr-2 h-5 w-5" /> Start Viva</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Demo phase: students present (screen share) ───
  // The control panel is loaded as a sidebar so any student can end the demo.
  if (phase === 'demo_in_progress') {
    return (
      <div className="relative h-full w-full flex bg-slate-950">
        <div className="flex-1 relative">
          <AgoraVideoRoom
            sessionId={sessionId}
            className="rounded-none border-0"
            onLocalTracks={handleLocalTracks}
            onScreenShareChange={(sharing, track) => {
              setIsSharingScreen(sharing)
              setScreenTrack(track)
            }}
            remoteJoinNotice="Examiner joining now"
          />
        </div>
        
        {/* Side control panel */}
        <div className="w-[360px] border-l border-slate-800/80 bg-slate-900/95 p-6 flex flex-col justify-center space-y-6 text-slate-100 z-30 shadow-2xl">
          <div className="text-center space-y-3">
            <Monitor className="mx-auto h-12 w-12 text-amber-400" />
            <h3 className="text-lg font-bold text-slate-100">Presentation Demo</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use "Share Screen" to present. Any student in the project group can trigger the transition to the viva.
            </p>
          </div>
          
          <Button
            onClick={handleEndDemo}
            disabled={endingDemo}
            className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-700 shadow-xl h-11"
          >
            {endingDemo ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Transitioning...</>
            ) : (
              <><CheckCircle2 className="mr-2 h-5 w-5" /> End Demo &amp; Start Viva</>
            )}
          </Button>
        </div>
      </div>
    )
  }

  if (!currentQuestion && !examinerQuestion) return null

  // ─── Q&A Panel Content (rendered as overlay inside AgoraVideoRoom) ───
  const qaOverlay = (
    <div
      className={`absolute top-0 right-0 bottom-[72px] w-[500px] max-w-full z-30 flex flex-col
        bg-slate-950/90 backdrop-blur-xl border-l border-slate-800/60
        transition-transform duration-300 ease-in-out
        ${showQAPanel ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-slate-200">Viva Q&A</span>
          <Badge variant={isRecording ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
            {isRecording ? 'REC' : 'Live'}
          </Badge>
        </div>
        <button
          onClick={() => setShowQAPanel(false)}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {/* Question metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {examinerQuestion ? (
            <Badge className="bg-amber-500/90 text-slate-950 hover:bg-amber-500">
              Question from Examiner
            </Badge>
          ) : currentQuestion ? (
            <>
              <Badge variant="outline" className="border-slate-700 text-slate-300">Q{currentQuestion.question_number}</Badge>
              <Badge variant="outline" className="border-slate-700 text-slate-300">{currentQuestion.criterion}</Badge>
              <Badge variant="secondary" className="text-slate-300">{currentQuestion.blooms_level}</Badge>
              <Badge variant="secondary" className="text-slate-300">{currentQuestion.difficulty}</Badge>
            </>
          ) : null}
        </div>

        {/* Question Card */}
        <div className={`rounded-xl border p-4 transition-colors duration-500 ${
          examinerQuestion
            ? 'border-amber-500/60 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
            : isRecording
              ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
              : isSpeaking
                ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                : 'border-slate-800 bg-slate-900/50'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {isSpeaking ? (
              <Volume2 className="h-5 w-5 animate-pulse text-blue-400 shrink-0" />
            ) : isRecording ? (
              <Mic className="h-5 w-5 animate-pulse text-red-500 shrink-0" />
            ) : (
              <VolumeX className="h-5 w-5 text-slate-500 shrink-0" />
            )}
            <span className="text-xs text-slate-400">
              {isSpeaking && 'Examiner is speaking...'}
              {isRecording && <span className="text-red-400 font-medium">Transcribing: {formatTime(recordingTime)}</span>}
              {!isSpeaking && !isRecording && <span className="text-slate-500">Unmute your mic to answer</span>}
            </span>
          </div>
          <p className="text-base font-medium text-slate-100 leading-relaxed">
            {examinerQuestion?.question_text ?? currentQuestion?.question_text}
          </p>
          {examinerQuestion && currentQuestion && (
            <p className="mt-2 text-[11px] text-amber-400/70">
              The AI question will resume after you answer the examiner.
            </p>
          )}
        </div>

        {/* Answer Textarea */}
        <div className="space-y-2">
          <Label htmlFor="answer-text" className="text-xs text-slate-400">Answer transcript</Label>
          <Textarea
            id="answer-text"
            value={answerText}
            onChange={(event) => setAnswerText(event.target.value)}
            placeholder={
              speechSupported
                ? 'Your speech will appear here. You can also type or edit.'
                : 'Speech recognition unavailable. Type your answer.'
            }
            className="min-h-24 resize-none bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-600 text-sm"
            disabled={isSubmitting}
          />
          {interimTranscript && (
            <p className="rounded-md bg-slate-900 px-3 py-2 text-xs text-slate-400 border border-slate-800">
              Listening: {interimTranscript}
            </p>
          )}
        </div>

        {/* Action Buttons — Skip and Submit only (Speak is now the Agora mic button) */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting || isRecording || !!examinerQuestion}
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <SkipForward className="mr-1.5 h-3.5 w-3.5" />
            Skip
          </Button>

          <Button
            size="sm"
            onClick={() => submitAnswer(answerText)}
            disabled={isSubmitting || isRecording || !answerText.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Submitting...</>
            ) : (
              <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Submit Answer</>
            )}
          </Button>
        </div>

        {/* Previous Feedback */}
        {lastFeedback && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Previous Feedback</span>
              <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
                {lastFeedback.score}/10
              </Badge>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              {lastFeedback.reasoning && <p>{lastFeedback.reasoning}</p>}
              {lastFeedback.strengths && <p className="text-green-400/80">✓ {lastFeedback.strengths}</p>}
              {lastFeedback.gaps && <p className="text-amber-400/80">△ {lastFeedback.gaps}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ─── Q&A Toggle Button (injected into AgoraVideoRoom's control bar) ───
  const qaToggleButton = (
    <>
      {/* Divider */}
      <div className="w-px h-8 bg-slate-700/50 mx-1" />

      <Button
        variant={showQAPanel ? 'default' : 'outline'}
        size="icon"
        onClick={() => setShowQAPanel(!showQAPanel)}
        className={`rounded-full w-12 h-12 shadow-md transition-all duration-300 hover:scale-105 relative ${
          showQAPanel ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
        }`}
        title="Toggle Q&A Panel"
      >
        <MessageSquareText className="w-5 h-5" />
        {currentQuestion && !showQAPanel && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>

      {/* Exit Session button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowExitConfirm(true)}
        className="rounded-full text-slate-400 hover:text-white hover:bg-slate-800 px-3 ml-1"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Exit
      </Button>
    </>
  )

  // ─── Collapsed Q&A tab (visible when panel is closed) ─────────────
  const collapsedTab = !showQAPanel ? (
    <button
      onClick={() => setShowQAPanel(true)}
      className="absolute right-0 top-1/2 -translate-y-1/2 z-30
        bg-blue-600/90 hover:bg-blue-600 backdrop-blur-md
        text-white px-4 py-8 rounded-l-2xl
        shadow-xl transition-all duration-300 hover:px-5 cursor-pointer
        flex flex-col items-center gap-2"
    >
      <ChevronRight className="w-5 h-5 rotate-180" />
      <span className="text-[14px] font-bold tracking-wider [writing-mode:vertical-lr] rotate-180">Q&A</span>
      {currentQuestion && (
        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse mt-1" />
      )}
    </button>
  ) : null

  // ─── Render: Full-screen Agora room with Q&A overlay ──────────────
  return (
    <div className="relative h-full w-full">
      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Exit Viva Session?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Your session is still in progress. If you leave now, your current
              question will be lost and you may not be able to rejoin. Are you
              sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
              Stay in Session
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                window.speechSynthesis.cancel()
                recognitionRef.current?.abort()
                router.back()
              }}
            >
              Exit Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AgoraVideoRoom
        sessionId={sessionId}
        className="rounded-none border-0"
        extraControls={qaToggleButton}
        onMicToggle={handleMicToggle}
        onLocalTracks={handleLocalTracks}
        remoteJoinNotice="Examiner joining now"
        overlayContent={
          <>
            {qaOverlay}
            {collapsedTab}
          </>
        }
      />
    </div>
  )
}
