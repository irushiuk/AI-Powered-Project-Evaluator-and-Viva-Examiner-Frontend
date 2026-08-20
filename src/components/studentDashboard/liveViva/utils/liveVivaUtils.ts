import type { BloomsLevel, VivaDifficulty, VivaQuestion } from '@/types/vivaSession'

export const SKIP_ANSWER_TEXT = 'Student skipped this question.'
export const FATAL_SPEECH_ERRORS = new Set([
  'not-allowed',
  'service-not-allowed',
  'audio-capture',
])

export type SpeechRecognitionAlternativeLike = {
  transcript: string
}

export type SpeechRecognitionResultLike = {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

export type SpeechRecognitionResultListLike = {
  length: number
  [index: number]: SpeechRecognitionResultLike
}

export type SpeechRecognitionEventLike = Event & {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

export type SpeechRecognitionErrorEventLike = Event & {
  error?: string
}

export type BrowserSpeechRecognition = {
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

export type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }

export function computeAverageHash(canvas: HTMLCanvasElement): string {
  const tinyCanvas = document.createElement('canvas')
  tinyCanvas.width = 8
  tinyCanvas.height = 8
  const context = tinyCanvas.getContext('2d')
  if (!context) return ''
  context.drawImage(canvas, 0, 0, 8, 8)

  const pixels = context.getImageData(0, 0, 8, 8).data
  const gray: number[] = []
  let total = 0
  for (let index = 0; index < 64; index += 1) {
    const offset = index * 4
    const average = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3
    gray.push(average)
    total += average
  }

  const average = total / 64
  return gray.map((value) => (value >= average ? '1' : '0')).join('')
}

export function getHammingDistance(first: string, second: string): number {
  let distance = 0
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) distance += 1
  }
  return distance
}

const questionCacheKey = (sessionId: string) => `live-viva-question:${sessionId}`

export function getCachedQuestion(sessionId: string): VivaQuestion | null {
  try {
    const value = window.sessionStorage.getItem(questionCacheKey(sessionId))
    return value ? (JSON.parse(value) as VivaQuestion) : null
  } catch {
    return null
  }
}

export function setCachedQuestion(sessionId: string, question: VivaQuestion) {
  try {
    window.sessionStorage.setItem(questionCacheKey(sessionId), JSON.stringify(question))
  } catch {
    // The cache only prevents duplicate starts; the viva can continue without it.
  }
}

export function clearCachedQuestion(sessionId: string) {
  try {
    window.sessionStorage.removeItem(questionCacheKey(sessionId))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function normalizeQuestion(data: Partial<VivaQuestion>): VivaQuestion | null {
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

export function appendTranscript(previous: string, next: string) {
  const cleanNext = next.trim()
  if (!cleanNext) return previous
  if (!previous.trim()) return cleanNext
  return `${previous.trim()} ${cleanNext}`
}

export function pickVoice(): SpeechSynthesisVoice | null {
  const englishVoices = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'))
  return (
    englishVoices.find((voice) => /Natural/i.test(voice.name)) ??
    englishVoices.find((voice) => /Online/i.test(voice.name)) ??
    englishVoices.find((voice) => /Google/i.test(voice.name)) ??
    englishVoices[0] ??
    null
  )
}
