'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock, Loader2, MessageSquarePlus, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  liveQuestionService,
  type LiveQuestion,
} from '@/services/liveQuestionService'

/**
 * Examiner interjection during an in-progress viva: type a question, it is
 * delivered live to the student's viva UI (taking priority over the next AI
 * question), and the answer appears here as soon as the student submits it.
 * Every interjected Q&A is stored on the session like any other viva Q&A.
 */
export default function LiveInterjectionCard({ sessionId }: { sessionId: string }) {
  const [questions, setQuestions] = useState<LiveQuestion[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      setQuestions(await liveQuestionService.list(sessionId))
    } catch {
      // transient poll failures are fine; next tick retries
    }
  }, [sessionId])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(id)
  }, [load])

  async function handleSend() {
    const text = draft.trim()
    if (!text) return
    setSending(true)
    try {
      const created = await liveQuestionService.ask(sessionId, text)
      setQuestions((prev) => [...prev, created])
      setDraft('')
      toast.success('Question sent to the student.')
      window.setTimeout(
        () => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
        100,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send question')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <MessageSquarePlus className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-900">Ask the Student</h3>
        <span className="text-[11px] text-gray-400">
          interrupts the AI — delivered live to the student
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Composer */}
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder="Type your question… (Enter to send)"
            rows={2}
            disabled={sending}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            onClick={() => void handleSend()}
            disabled={sending || !draft.trim()}
            className="self-end px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </div>

        {/* Q&A history */}
        {questions.length > 0 && (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {questions.map((q) => (
              <div key={q.question_id} className="space-y-1.5">
                <div className="rounded-xl bg-indigo-50 px-3 py-2">
                  <p className="text-sm text-gray-800">{q.question_text}</p>
                </div>
                {q.answer ? (
                  <div className="rounded-xl bg-gray-50 px-3 py-2 ml-4">
                    <p className="text-sm text-gray-700">{q.answer.answer_text}</p>
                    <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {q.answer.answered_by}
                    </p>
                  </div>
                ) : (
                  <p className="ml-4 text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-pulse" />
                    Waiting for the student's answer…
                  </p>
                )}
              </div>
            ))}
            <div ref={listEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
