import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FATAL_SPEECH_ERRORS,
  pickVoice,
  type BrowserSpeechRecognition,
  type SpeechRecognitionWindow,
} from '../utils/liveVivaUtils'

interface UseVivaSpeechOptions {
  questionText: string | null
  canListen: boolean
  onFinalTranscript: (transcript: string) => void
}

export function useVivaSpeech({ questionText, canListen, onFinalTranscript }: UseVivaSpeechOptions) {
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [micMuted, setMicMutedState] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [recordingTime, setRecordingTime] = useState(0)

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const micBlockedRef = useRef(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const onFinalTranscriptRef = useRef(onFinalTranscript)

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript
  }, [onFinalTranscript])

  const stopRecognition = useCallback((abort = false) => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (abort) recognition?.abort()
    else recognition?.stop()
    setIsRecording(false)
    setInterimTranscript('')
  }, [])

  const startRecognition = useCallback(() => {
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
      setIsRecording(false)
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
    setIsRecording(true)
  }, [])

  useEffect(() => {
    voiceRef.current = pickVoice()
    const onVoicesChanged = () => { voiceRef.current = pickVoice() }
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
  }, [])

  useEffect(() => {
    if (!questionText) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(questionText)
    utterance.voice = voiceRef.current
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
    return () => window.speechSynthesis.cancel()
  }, [questionText])

  useEffect(() => {
    if (!canListen || isSpeaking || micMuted || isRecording) return
    startRecognition()
  }, [canListen, isRecording, isSpeaking, micMuted, startRecognition])

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
  }, [])

  const setMicMuted = useCallback((muted: boolean) => {
    setMicMutedState(muted)
    if (muted) stopRecognition()
    else micBlockedRef.current = false
  }, [stopRecognition])

  const clearInterimTranscript = useCallback(() => setInterimTranscript(''), [])
  const abortRecognition = useCallback(() => stopRecognition(true), [stopRecognition])

  return {
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
  }
}
