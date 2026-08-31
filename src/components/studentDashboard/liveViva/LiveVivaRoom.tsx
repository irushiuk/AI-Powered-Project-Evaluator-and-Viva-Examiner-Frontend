'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, SkipForward } from 'lucide-react'
import { vivaSessionService } from '@/services/vivaSessionService'
import type { SessionPhase, VivaQuestion } from '@/types/vivaSession'
import { toast } from 'sonner'
import {
  liveQuestionService,
  type LiveQuestion,
  type SessionTakeoverStatus,
} from '@/services/liveQuestionService'
import type { IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import type { ScreenTrack } from '@/components/agora/components/AgoraRoomView'
import { useDemoCapture } from './hooks/useDemoCapture'
import { useVivaSpeech } from './hooks/useVivaSpeech'
import { LiveVivaRoomView } from './LiveVivaRoomView'
import {
  SKIP_ANSWER_TEXT,
  appendTranscript,
  clearCachedQuestion,
  getCachedQuestion,
  normalizeQuestion,
  setCachedQuestion,
  type BrowserSpeechRecognition,
  type SpeechRecognitionWindow,
} from './utils/liveVivaUtils'

export interface LiveVivaRoomProps {
  sessionId: string
  /** If true, renders the room in read-only mode for the examiner, hiding submit/skip buttons and disabling inputs. */
  isExaminerView?: boolean
}

export function LiveVivaRoom({ sessionId, isExaminerView }: LiveVivaRoomProps) {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState<VivaQuestion | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Mirrors AgoraVideoRoom's own mute state, which starts unmuted — the mic is
  // already live on join, so listening must not wait for a button press.
  const [hasFinished, setHasFinished] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showQAPanel, setShowQAPanel] = useState(true)
  // A live question typed by the examiner takes priority over the AI flow;
  // the current AI question stays parked until this is answered.
  const [examinerQuestion, setExaminerQuestion] = useState<LiveQuestion | null>(null)
  const [examinerQuestionInProgress, setExaminerQuestionInProgress] = useState(false)
  const [remoteParticipantSpeaking, setRemoteParticipantSpeaking] = useState(false)
  const seenExaminerQuestionsRef = useRef<Set<string>>(new Set())
  const interventionActiveRef = useRef(false)
  const parkedAiAnswerRef = useRef('')
  const answerTextRef = useRef('')

  // Examiner Takeover States
  const [takeoverStatus, setTakeoverStatus] = useState<SessionTakeoverStatus | null>(null)
  const [examinerDraftText, setExaminerDraftText] = useState('')
  const examinerDraftTextRef = useRef('')
  const [activePreemptiveId, setActivePreemptiveId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const examinerRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)

  useEffect(() => {
    answerTextRef.current = answerText
  }, [answerText])

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
  const [screenTrack, setScreenTrack] = useState<ScreenTrack>(null)
  const [demoAudioTrack, setDemoAudioTrack] = useState<IMicrophoneAudioTrack | null>(null)

  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const startRequestRef = useRef(false)
  const mountedRef = useRef(false)

  // The viva is recorded server-side by Agora Cloud Recording (started at the
  // viva transition, stopped at end-viva, written straight to Azure Blob), so
  // the browser holds no recorder: nothing to upload, and a crash here can no
  // longer cost the examiner their behavioral report. See
  // agora_service/cloud_recording.py.
  const handleLocalTracks = useCallback((_videoTrack: unknown, audioTrack: unknown) => {
    setDemoAudioTrack(audioTrack as IMicrophoneAudioTrack | null)
  }, [])

  const { stopCapture } = useDemoCapture({
    sessionId,
    enabled: phase === 'demo_in_progress',
    audioTrack: demoAudioTrack,
    screenTrack,
  })

  const {
    interimTranscript,
    clearInterimTranscript,
    isRecording,
    isSpeaking,
    micMuted,
    speechSupported,
    recordingTime,
    setMicMuted,
    stopRecognition,
    abortRecognition,
  } = useVivaSpeech({
    sessionId,
    // The examiner asks live through Agora. Never synthesize that question a
    // second time, and never run the student speech pipeline in examiner view.
    questionText: hasFinished || isExaminerView || takeoverStatus?.paused
      ? null
      : (currentQuestion?.question_text ?? null),
    questionId: hasFinished || isExaminerView || takeoverStatus?.paused
      ? null
      : (currentQuestion?.question_id ?? null),
    audioUrl: currentQuestion?.audio_url ?? null,
    ttsStatus: currentQuestion?.tts_status ?? 'disabled',
    canListen: (
      !isExaminerView && !hasFinished && !isLoading && !isSubmitting &&
      phase === 'viva_in_progress' && !examinerQuestionInProgress &&
      !remoteParticipantSpeaking &&
      (!takeoverStatus?.paused || Boolean(examinerQuestion)) &&
      Boolean(currentQuestion || examinerQuestion)
    ),
    onFinalTranscript: (transcript) => {
      if (!isExaminerView) {
        setAnswerText((previous) => appendTranscript(previous, transcript))
      }
    },
  })

  const beginExaminerIntervention = useCallback(() => {
    if (!interventionActiveRef.current) {
      interventionActiveRef.current = true
      parkedAiAnswerRef.current = answerTextRef.current
      answerTextRef.current = ''
      setAnswerText('')
    }
    abortRecognition()
    clearInterimTranscript()
  }, [abortRecognition, clearInterimTranscript])

  useEffect(() => {
    if (currentQuestion || examinerQuestion) setShowQAPanel(true)
  }, [currentQuestion, examinerQuestion])

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
      ; (async () => {
        try {
          const status = await vivaSessionService.getSessionStatus(sessionId)
          if (!mountedRef.current) return
          setDemoEnabled(status.demo_enabled)
          setPhase(status.phase)
          if (status.phase === 'completed') {
            setHasFinished(true)
            setIsLoading(false)
          } else if (status.phase === 'viva_in_progress') {
            loadFirstQuestion()
          } else {
            setIsLoading(false)
          }
        } catch {
          if (!mountedRef.current) return
          if (getCachedQuestion(sessionId)) {
            setPhase('viva_in_progress')
            loadFirstQuestion()
          } else {
            setPhase('scheduled')
            setIsLoading(false)
          }
        }
      })()

    return () => {
      mountedRef.current = false
      try {
        examinerRecognitionRef.current?.abort()
      } catch {
        // Recognition may already be stopped.
      }
      examinerRecognitionRef.current = null
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

  // Poll takeover status for both student and examiner
  useEffect(() => {
    if (hasFinished || phase !== 'viva_in_progress') return
    const id = window.setInterval(async () => {
      try {
        const st = await liveQuestionService.status(sessionId)
        if (!mountedRef.current) return
        setTakeoverStatus((previous) => (
          isExaminerView || !previous
            ? st
            : { ...st, paused: previous.paused }
        ))
      } catch {
        // Status polling is resilient; the next interval retries.
      }
    }, 4000)
    // Initial fetch
    liveQuestionService.status(sessionId).then(st => {
      if (mountedRef.current) {
        setTakeoverStatus((previous) => (
          isExaminerView || !previous
            ? st
            : { ...st, paused: previous.paused }
        ))
      }
    }).catch(() => { })
    return () => window.clearInterval(id)
  }, [sessionId, hasFinished, phase, isExaminerView])

  // Poll the phase throughout the whole session so we can detect
  // completion reliably regardless of examiner takeover state.
  useEffect(() => {
    if (phase === 'completed' || hasFinished) return
    const id = window.setInterval(async () => {
      try {
        const status = await vivaSessionService.getSessionStatus(sessionId)
        if (!mountedRef.current) return

        if (status.phase === 'completed') {
          window.clearInterval(id)
          setPhase('completed')
          setHasFinished(true)
          if (!isExaminerView) {
            toast.success('Viva session completed successfully.')
            window.setTimeout(() => router.push('/dashboard/student/sessions'), 3000)
          } else {
            router.push(`/dashboard/teacher/sessions/${sessionId}/report`)
          }
        } else if (status.phase === 'viva_in_progress') {
          if (phase !== 'viva_in_progress') {
            setPhase('viva_in_progress')
            setIsLoading(true)
            loadFirstQuestion()
          }
        } else if (status.phase !== phase) {
          setPhase(status.phase)
        }
      } catch {
        // transient; next tick retries
      }
    }, 5000)
    return () => window.clearInterval(id)
  }, [phase, sessionId, loadFirstQuestion, hasFinished, isExaminerView, router])

  // Trigger warmup when demo starts locally or when synced
  useEffect(() => {
    if (phase === 'demo_in_progress') {
      vivaSessionService.startWarmup(sessionId).catch(() => undefined)
    }
  }, [phase, sessionId])

  // Poll for examiner-interjected questions while the viva is running.
  useEffect(() => {
    if (isExaminerView || isLoading || hasFinished || phase !== 'viva_in_progress') return
    const id = window.setInterval(async () => {
      try {
        const { pending, examiner_speaking, paused } =
          await liveQuestionService.pending(sessionId)
        setTakeoverStatus((previous) => previous
          ? { ...previous, paused }
          : {
              paused,
              ai_questions_asked: 0,
              examiner_questions_asked: 0,
              max_ai_questions: 0,
              session_status: 'in_progress',
            })
        if (examiner_speaking) {
          beginExaminerIntervention()
          setExaminerQuestionInProgress(true)
          setTakeoverStatus((previous) => previous
            ? { ...previous, paused: true }
            : previous)
        }
        if (
          pending &&
          !seenExaminerQuestionsRef.current.has(pending.question_id)
        ) {
          beginExaminerIntervention()
          seenExaminerQuestionsRef.current.add(pending.question_id)
          setExaminerQuestion(pending)
          setExaminerQuestionInProgress(false)
          toast.info('The examiner has asked you a question.', {
            duration: 6000,
          })
        } else if (pending) {
          // Refresh text for a question that was first observed as a draft.
          setExaminerQuestion(pending)
          setExaminerQuestionInProgress(false)
        }
      } catch {
        // transient poll failures are fine; next tick retries
      }
    }, 400)
    return () => window.clearInterval(id)
  }, [
    sessionId,
    isLoading,
    hasFinished,
    phase,
    isExaminerView,
    beginExaminerIntervention,
  ])

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
          clearInterimTranscript()
          toast.info('Your teammate answered — moving to the next question.')
        }
      } catch {
        // transient; next tick retries
      }
    }, 4000)
    return () => window.clearInterval(id)
  }, [
    sessionId, isLoading, hasFinished, phase, isSubmitting,
    examinerQuestion, currentQuestion?.question_id, clearInterimTranscript,
  ])

  const handleRetry = () => {
    startRequestRef.current = false
    loadFirstQuestion()
  }

  // Called by the Agora mic button. Muting stops listening; unmuting just
  // clears the way — the auto-start effect below decides when to resume, so
  // we never cut off a question that is still being asked.
  const handleMicToggle = (isMuted: boolean) => {
    setMicMuted(isMuted)

    if (isMuted) {
      if (isRecording) {
        toast('Mic muted — recording stopped.', { icon: <MicOff className="h-4 w-4 text-slate-400" /> })
      }
    } else {
      toast('Mic on — speak your answer.', { icon: <Mic className="h-4 w-4 text-green-500" /> })
    }
  }

  // Examiner Controls
  const handlePauseAI = async () => {
    setActionLoading('pause')
    const previousStatus = takeoverStatus
    setTakeoverStatus((previous) => previous
      ? { ...previous, paused: true }
      : {
          paused: true,
          ai_questions_asked: 0,
          examiner_questions_asked: 0,
          max_ai_questions: 0,
          session_status: 'in_progress',
        })
    window.speechSynthesis.cancel()
    try {
      await liveQuestionService.takeover(sessionId)
      toast.success('AI Questioning Paused')
    } catch {
      setTakeoverStatus(previousStatus)
      toast.error('Failed to pause AI')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResumeAI = async () => {
    setActionLoading('resume')
    const previousStatus = takeoverStatus
    setTakeoverStatus((previous) => previous
      ? { ...previous, paused: false }
      : previous)
    try {
      await liveQuestionService.resume(sessionId)
      toast.success('AI Questioning Resumed')
    } catch {
      setTakeoverStatus(previousStatus)
      toast.error('Failed to resume AI')
    } finally {
      setActionLoading(null)
    }
  }

  const stopExaminerRecognition = useCallback(async () => {
    const recognition = examinerRecognitionRef.current
    if (!recognition) return examinerDraftTextRef.current.trim()

    return new Promise<string>((resolve) => {
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        window.clearTimeout(timeout)
        if (examinerRecognitionRef.current === recognition) {
          examinerRecognitionRef.current = null
        }
        resolve(examinerDraftTextRef.current.trim())
      }
      const previousOnEnd = recognition.onend
      recognition.onend = () => {
        previousOnEnd?.()
        finish()
      }
      const timeout = window.setTimeout(finish, 1200)
      try {
        recognition.stop()
      } catch {
        finish()
      }
    })
  }, [])

  const handleEndSession = async () => {
    setActionLoading('end')
    try {
      // Auto-save any in-progress voice question transcript before ending
      if (activePreemptiveId) {
        const finalQuestionText = await stopExaminerRecognition()
        if (finalQuestionText) {
          try {
            await liveQuestionService.updatePreemptive(
              sessionId,
              activePreemptiveId,
              finalQuestionText,
            )
          } catch {
            // Best-effort save; proceed with ending regardless.
          }
        }
        setActivePreemptiveId(null)
        examinerDraftTextRef.current = ''
        setExaminerDraftText('')
      }
      await liveQuestionService.endSession(sessionId)
      toast.success('Session Ended by Examiner')
      router.push(`/dashboard/teacher/sessions/${sessionId}/report`)
    } catch {
      toast.error('Failed to end session')
      setActionLoading(null)
    }
  }

  const startExaminerRecognition = () => {
    const speechWindow = window as SpeechRecognitionWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) return false

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''
      for (let i = 0; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript ?? ''
        if (event.results[i].isFinal) finalTranscript += transcript
        else interimTranscript += transcript
      }
      const visibleTranscript = appendTranscript(finalTranscript, interimTranscript)
      if (visibleTranscript) {
        examinerDraftTextRef.current = visibleTranscript
        setExaminerDraftText(visibleTranscript)
      }
    }
    recognition.onerror = (event) => {
      if (examinerRecognitionRef.current === recognition) {
        examinerRecognitionRef.current = null
      }
      if (event.error && !['aborted', 'no-speech'].includes(event.error)) {
        toast.warning(
          `Voice transcription stopped (${event.error}). You can type the question before saving.`,
        )
      }
    }
    recognition.onend = () => {
      if (examinerRecognitionRef.current === recognition) {
        examinerRecognitionRef.current = null
      }
    }
    examinerRecognitionRef.current = recognition
    try {
      recognition.start()
      return true
    } catch {
      examinerRecognitionRef.current = null
      return false
    }
  }

  const handleStartExaminerQuestion = async () => {
    // SpeechRecognition must start inside the original button gesture. Starting
    // it after awaiting the API request loses microphone permission in some
    // Chrome/Edge configurations and produces an empty transcript.
    examinerDraftTextRef.current = ''
    setExaminerDraftText('')
    const browserRecognitionStarted = startExaminerRecognition()
    setActionLoading('start_q')
    try {
      if (!demoAudioTrack) {
        throw new Error('The call microphone is not ready yet.')
      }
      await demoAudioTrack.setEnabled(true)
      const { question_id } = await liveQuestionService.createPreemptive(sessionId)
      setActivePreemptiveId(question_id)
      setTakeoverStatus((previous) => previous
        ? { ...previous, paused: true }
        : previous)
      if (!browserRecognitionStarted) {
        toast.warning('Live voice transcription is not supported by this browser. Please type the question.')
      }
    } catch (error) {
      try {
        examinerRecognitionRef.current?.abort()
      } catch {
        // Recognition may already have stopped.
      }
      examinerRecognitionRef.current = null
      toast.error(error instanceof Error
        ? error.message
        : 'Failed to access or enable the examiner microphone.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendExaminerQuestion = async () => {
    if (!activePreemptiveId) return
    setActionLoading('send_q')
    try {
      const finalQuestionText = await stopExaminerRecognition()
      if (!finalQuestionText) {
        toast.error('No question was transcribed. Please type the question before saving.')
        return
      }
      await liveQuestionService.updatePreemptive(
        sessionId,
        activePreemptiveId,
        finalQuestionText,
      )
      setActivePreemptiveId(null)
      examinerDraftTextRef.current = ''
      setExaminerDraftText('')
      toast.success('Question text saved to transcript')
    } catch {
      toast.error('Failed to save question text')
    } finally {
      setActionLoading(null)
    }
  }

  const handleExaminerDraftChange = useCallback((text: string) => {
    examinerDraftTextRef.current = text
    setExaminerDraftText(text)
  }, [])

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
        const parkedAnswer = parkedAiAnswerRef.current
        parkedAiAnswerRef.current = ''
        interventionActiveRef.current = false
        setExaminerQuestionInProgress(false)
        answerTextRef.current = parkedAnswer
        setAnswerText(parkedAnswer)
        clearInterimTranscript()
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

      if (response.session_complete) {
        clearCachedQuestion(sessionId)
        setHasFinished(true)
        toast.success('Viva session completed successfully.')
        window.setTimeout(() => router.push('/dashboard/student/sessions'), 2200)
        return
      }

      const nextQuestion = response.next_question ? normalizeQuestion(response.next_question) : null

      if (!nextQuestion) {
        throw new Error('The backend did not return the next viva question.')
      }

      setCurrentQuestion(nextQuestion)
      setCachedQuestion(sessionId, nextQuestion)
      setAnswerText('')
      clearInterimTranscript()
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
      stopCapture()

      await vivaSessionService.endDemo(sessionId)

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

  return (
    <LiveVivaRoomView
      sessionId={sessionId}
      isExaminerView={isExaminerView}
      isLoading={isLoading}
      loadError={loadError}
      hasFinished={hasFinished}
      phase={phase}
      demoEnabled={demoEnabled}
      startingSession={startingSession}
      endingDemo={endingDemo}
      currentQuestion={currentQuestion}
      examinerQuestion={examinerQuestion}
      examinerQuestionInProgress={examinerQuestionInProgress}
      takeoverStatus={takeoverStatus}
      showQAPanel={showQAPanel}
      setShowQAPanel={setShowQAPanel}
      isRecording={isRecording}
      isSpeaking={isSpeaking}
      recordingTime={recordingTime}
      micMuted={micMuted}
      answerText={answerText}
      setAnswerText={setAnswerText}
      speechSupported={speechSupported}
      interimTranscript={interimTranscript}
      isSubmitting={isSubmitting}
      actionLoading={actionLoading}
      activePreemptiveId={activePreemptiveId}
      examinerDraftText={examinerDraftText}
      setExaminerDraftText={handleExaminerDraftChange}
      showExitConfirm={showExitConfirm}
      setShowExitConfirm={setShowExitConfirm}
      handleLocalTracks={handleLocalTracks}
      onScreenTrackChange={setScreenTrack}
      handleRetry={handleRetry}
      handleStartDemo={handleStartDemo}
      handleStartViva={handleStartViva}
      handleEndDemo={handleEndDemo}
      handleSkip={handleSkip}
      submitAnswer={submitAnswer}
      handlePauseAI={handlePauseAI}
      handleResumeAI={handleResumeAI}
      handleEndSession={handleEndSession}
      handleStartExaminerQuestion={handleStartExaminerQuestion}
      handleSendExaminerQuestion={handleSendExaminerQuestion}
      handleMicToggle={handleMicToggle}
      onRemoteAudioActivity={setRemoteParticipantSpeaking}
      abortRecognition={abortRecognition}
      onBack={() => router.back()}
    />
  )
}
