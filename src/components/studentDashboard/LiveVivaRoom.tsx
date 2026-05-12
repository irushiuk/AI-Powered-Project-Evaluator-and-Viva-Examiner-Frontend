'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Mic, 
  MicOff, 
  SkipForward, 
  CheckCircle2, 
  Volume2, 
  VolumeX,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// Mock questions for the live viva session
const MOCK_QUESTIONS = [
  "Can you explain the main objective of your project and what problem it solves?",
  "What were the key technical challenges you faced during the implementation, and how did you overcome them?",
  "Could you walk me through the system architecture and explain why you chose these specific technologies?",
  "How did you handle edge cases and ensure the reliability of your application?",
  "If you had more time, what features or improvements would you add to the project?",
  "What is the most important lesson you learned while working on this project?"
]

export function LiveVivaRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hasFinished, setHasFinished] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // To keep track of recording time
  const [recordingTime, setRecordingTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const totalQuestions = MOCK_QUESTIONS.length
  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex]
  const progressPercentage = ((currentQuestionIndex) / totalQuestions) * 100

  // Simulate AI asking the question (Text-to-Speech)
  useEffect(() => {
    if (hasFinished) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(currentQuestion)
    
    // Customize voice if needed
    // const voices = window.speechSynthesis.getVoices()
    // utterance.voice = voices.find(v => v.lang.includes('en')) || null
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [currentQuestionIndex, currentQuestion, hasFinished])

  // Handle Recording Timer
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

  const handleNextQuestion = () => {
    setIsRecording(false)
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      handleCompleteSession()
    }
  }

  const handleAnswerToggle = () => {
    if (isRecording) {
      // Finish answering
      setIsRecording(false)
      toast.success("Answer recorded and submitted for analysis.")
      // Automatically move to the next question after a brief delay
      setTimeout(handleNextQuestion, 1000)
    } else {
      // Start answering
      window.speechSynthesis.cancel() // Stop AI speaking if user interrupts
      setIsSpeaking(false)
      setIsRecording(true)
      toast("Recording started...", { icon: <Mic className="h-4 w-4 text-red-500" /> })
    }
  }

  const handleSkip = () => {
    toast("Question skipped.", { icon: <SkipForward className="h-4 w-4" /> })
    handleNextQuestion()
  }

  const handleCompleteSession = () => {
    setHasFinished(true)
    setIsSubmitting(true)
    // Simulate backend processing
    setTimeout(() => {
      setIsSubmitting(false)
      toast.success("Viva session completed successfully! Results will be available soon.")
      router.push(`/dashboard/student/sessions/${sessionId}`)
    }, 3000)
  }

  if (hasFinished) {
    return (
      <Card className="max-w-2xl mx-auto mt-12 text-center py-12">
        <CardContent className="space-y-6">
          {isSubmitting ? (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Analyzing Responses...</h2>
              <p className="text-muted-foreground">Please wait while our AI evaluates your answers.</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Session Complete!</h2>
              <p className="text-muted-foreground">Redirecting you back to the session details...</p>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header & Progress */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Exit Session
          </Button>
          <Badge variant={isRecording ? "destructive" : "secondary"} className="animate-in fade-in transition-colors">
            {isRecording ? "Recording Live" : "Live Room"}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Question Progress</span>
            <span>{currentQuestionIndex + 1} / {totalQuestions}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Main Question Area */}
      <Card className={`border-2 transition-colors duration-500 ${isRecording ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : isSpeaking ? 'border-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-border'}`}>
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center relative">
            {isSpeaking ? (
              <Volume2 className="h-8 w-8 text-primary animate-pulse" />
            ) : isRecording ? (
              <Mic className="h-8 w-8 text-red-500 animate-pulse" />
            ) : (
              <VolumeX className="h-8 w-8 text-muted-foreground" />
            )}
            
            {/* Ripple effect when speaking or recording */}
            {(isSpeaking || isRecording) && (
              <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isRecording ? 'bg-red-500' : 'bg-primary'}`}></div>
            )}
          </div>
          
          <CardTitle className="text-2xl leading-relaxed">
            "{currentQuestion}"
          </CardTitle>
          
          <CardDescription className="text-base h-6">
            {isSpeaking && "Examiner is speaking..."}
            {isRecording && <span className="text-red-500 font-medium">Recording Answer: {formatTime(recordingTime)}</span>}
            {!isSpeaking && !isRecording && "Waiting for your response..."}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-border/50">
            <Button 
              size="lg" 
              variant="outline" 
              onClick={handleSkip}
              disabled={isRecording}
              className="w-full sm:w-32"
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip
            </Button>
            
            <Button 
              size="lg" 
              variant={isRecording ? "default" : "default"}
              onClick={handleAnswerToggle}
              className={`w-full sm:w-48 transition-all ${isRecording ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
            >
              {isRecording ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Finish Answer
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-5 w-5" />
                  Answer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Instructions */}
      <p className="text-center text-sm text-muted-foreground">
        Click "Answer" when you are ready to speak. The AI will convert your voice to text and analyze it.
      </p>
    </div>
  )
}
