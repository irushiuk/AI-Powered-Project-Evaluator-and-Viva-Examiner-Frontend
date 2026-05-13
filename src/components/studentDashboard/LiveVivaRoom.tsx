'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { vivaSessionService } from '@/services/vivaSessionService'
import type {
  BloomsLevel,
  SubmitVivaAnswerResponse,
  VivaDifficulty,
  VivaQuestion,
} from '@/types/vivaSession'
import { toast } from 'sonner'

const SKIP_ANSWER_TEXT = 'Student skipped this question.'

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

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const startRequestRef = useRef(false)
  const mountedRef = useRef(false)

  const loadFirstQuestion = useCallback(async () => {
    if (startRequestRef.current) return
    startRequestRef.current = true
    setIsLoading(true)
    setLoadError(null)

    const cachedQuestion = getCachedQuestion(sessionId)
    if (cachedQuestion) {
      setCurrentQuestion(cachedQuestion)
      setIsLoading(false)
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
      if (mountedRef.current) setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    mountedRef.current = true
    loadFirstQuestion()

    return () => {
      mountedRef.current = false
      window.speechSynthesis.cancel()
      recognitionRef.current?.abort()
    }
  }, [loadFirstQuestion])

  useEffect(() => {
    if (!currentQuestion || hasFinished) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(currentQuestion.question_text)
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [currentQuestion, hasFinished])

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
      toast.success('Transcript captured. Review it, then submit your answer.')
      return
    }

    const speechWindow = window as SpeechRecognitionWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

    if (!Recognition) {
      setSpeechSupported(false)
      toast.error('Speech recognition is not supported in this browser. Type your answer instead.')
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
      toast.error(event.error ? `Speech recognition stopped: ${event.error}` : 'Speech recognition stopped.')
    }

    recognition.onend = () => {
      setIsRecording(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    toast('Recording started...', { icon: <Mic className="h-4 w-4 text-red-500" /> })
  }

  const submitAnswer = async (rawAnswer: string) => {
    if (!currentQuestion) return

    const answer = rawAnswer.trim()
    if (!answer) {
      toast.error('Please speak or type an answer before submitting.')
      return
    }

    if (isRecording) stopRecognition()

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

  if (isLoading) {
    return (
      <Card className="mx-auto mt-12 max-w-2xl py-12 text-center">
        <CardContent className="space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="text-2xl font-bold">Starting Viva Session</h2>
          <p className="text-muted-foreground">Generating your first question from the evaluation rubric.</p>
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card className="mx-auto mt-12 max-w-2xl py-10 text-center">
        <CardContent className="space-y-5">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Could Not Start Session</h2>
            <p className="text-muted-foreground">{loadError}</p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleRetry}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (hasFinished) {
    return (
      <Card className="mx-auto mt-12 max-w-2xl py-12 text-center">
        <CardContent className="space-y-6">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold">Session Complete</h2>
          <p className="text-muted-foreground">Your answers were submitted. Redirecting you back to your sessions.</p>
        </CardContent>
      </Card>
    )
  }

  if (!currentQuestion) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Exit Session
          </Button>
          <Badge variant={isRecording ? 'destructive' : 'secondary'} className="transition-colors">
            {isRecording ? 'Recording Live' : 'Live Room'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 px-4 py-3 text-sm">
          <span className="font-medium">Question {currentQuestion.question_number}</span>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{currentQuestion.criterion}</Badge>
            <Badge variant="secondary">{currentQuestion.blooms_level}</Badge>
            <Badge variant="secondary">{currentQuestion.difficulty}</Badge>
          </div>
        </div>
      </div>

      <Card
        className={`border-2 transition-colors duration-500 ${
          isRecording
            ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
            : isSpeaking
              ? 'border-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
              : 'border-border'
        }`}
      >
        <CardHeader className="space-y-4 text-center">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {isSpeaking ? (
              <Volume2 className="h-8 w-8 animate-pulse text-primary" />
            ) : isRecording ? (
              <Mic className="h-8 w-8 animate-pulse text-red-500" />
            ) : (
              <VolumeX className="h-8 w-8 text-muted-foreground" />
            )}

            {(isSpeaking || isRecording) && (
              <div
                className={`absolute inset-0 animate-ping rounded-full opacity-20 ${
                  isRecording ? 'bg-red-500' : 'bg-primary'
                }`}
              />
            )}
          </div>

          <CardTitle className="text-2xl leading-relaxed">
            {currentQuestion.question_text}
          </CardTitle>

          <CardDescription className="text-base">
            {isSpeaking && 'Examiner is speaking...'}
            {isRecording && (
              <span className="font-medium text-red-500">Recording answer: {formatTime(recordingTime)}</span>
            )}
            {!isSpeaking && !isRecording && 'Speak your answer or type it below.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="answer-text">Answer transcript</Label>
            <Textarea
              id="answer-text"
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder={
                speechSupported
                  ? 'Your speech transcript will appear here. You can also type or edit before submitting.'
                  : 'Speech recognition is unavailable. Type your answer here.'
              }
              className="min-h-32 resize-none"
              disabled={isSubmitting}
            />
            {interimTranscript && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Listening: {interimTranscript}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center gap-3 border-t border-border/50 pt-4 sm:flex-row">
            <Button
              size="lg"
              variant="outline"
              onClick={handleSkip}
              disabled={isSubmitting || isRecording}
              className="w-full sm:w-32"
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip
            </Button>

            <Button
              size="lg"
              variant={isRecording ? 'secondary' : 'outline'}
              onClick={handleRecordingToggle}
              disabled={isSubmitting}
              className="w-full sm:w-44"
            >
              {isRecording ? (
                <>
                  <MicOff className="mr-2 h-5 w-5" />
                  Finish
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-5 w-5" />
                  Speak
                </>
              )}
            </Button>

            <Button
              size="lg"
              onClick={() => submitAnswer(answerText)}
              disabled={isSubmitting || isRecording || !answerText.trim()}
              className="w-full sm:w-44"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {lastFeedback && (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Previous Answer Feedback</CardTitle>
            <CardDescription>Score: {lastFeedback.score}/10</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {lastFeedback.reasoning && <p>{lastFeedback.reasoning}</p>}
            {lastFeedback.strengths && <p>Strengths: {lastFeedback.strengths}</p>}
            {lastFeedback.gaps && <p>Gaps: {lastFeedback.gaps}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
