"use client";

import { CheckCircle2, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SessionTakeoverStatus } from "@/services/liveQuestionService";

interface ExaminerTakeoverPanelProps {
  takeoverStatus: SessionTakeoverStatus | null;
  actionLoading: string | null;
  activePreemptiveId: string | null;
  examinerDraftText: string;
  onDraftChange: (text: string) => void;
  onPauseAI: () => Promise<void>;
  onResumeAI: () => Promise<void>;
  onEndSession: () => Promise<void>;
  onStartQuestion: () => Promise<void>;
  onSendQuestion: () => Promise<void>;
}

export function ExaminerTakeoverPanel({
  takeoverStatus,
  actionLoading,
  activePreemptiveId,
  examinerDraftText,
  onDraftChange,
  onPauseAI,
  onResumeAI,
  onEndSession,
  onStartQuestion,
  onSendQuestion,
}: ExaminerTakeoverPanelProps) {
  return (
    <div className="mt-6 space-y-4 border-t border-slate-800 pt-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-200">
          Session Control
        </h4>
        <div className="mb-4 flex gap-2">
          {takeoverStatus?.paused ? (
            <Button
              onClick={onResumeAI}
              disabled={actionLoading === "resume"}
              className="flex-1 border-0 bg-green-600 text-white shadow-lg hover:bg-green-700"
            >
              {actionLoading === "resume" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resuming...
                </>
              ) : (
                "Resume AI"
              )}
            </Button>
          ) : (
            <Button
              onClick={onPauseAI}
              disabled={actionLoading === "pause"}
              className="flex-1 border-0 bg-amber-600 text-white shadow-lg hover:bg-amber-700"
            >
              {actionLoading === "pause" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pausing...
                </>
              ) : (
                "Pause AI"
              )}
            </Button>
          )}
          <Button
            onClick={onEndSession}
            disabled={actionLoading === "end"}
            variant="destructive"
            className="shadow-lg"
          >
            {actionLoading === "end" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ending...
              </>
            ) : (
              "End Session"
            )}
          </Button>
        </div>
        {takeoverStatus && (
          <div className="space-y-1.5 rounded-lg border border-slate-800/80 bg-slate-900/50 p-2.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>AI Questions:</span>
              <span className="font-medium text-slate-300">
                {takeoverStatus.ai_questions_asked} /{" "}
                {takeoverStatus.max_ai_questions}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Examiner Questions:</span>
              <span className="font-medium text-slate-300">
                {takeoverStatus.examiner_questions_asked}
              </span>
            </div>
          </div>
        )}
      </div>

      {takeoverStatus?.paused && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-900/10 p-4 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
          <h4 className="mb-3 text-sm font-semibold text-blue-400">
            Ask Question (Voice)
          </h4>
          {!activePreemptiveId ? (
            <Button
              onClick={onStartQuestion}
              disabled={actionLoading === "start_q"}
              className="h-11 w-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
            >
              {actionLoading === "start_q" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" /> Start Speaking
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex animate-pulse items-center gap-2 rounded border border-red-900/50 bg-red-950/30 p-2 text-xs font-semibold text-red-400">
                <Mic className="h-4 w-4" /> Recording... (Student can hear you)
              </div>
              <Textarea
                value={examinerDraftText}
                onChange={(event) => onDraftChange(event.target.value)}
                className="min-h-24 border-slate-700 bg-slate-900/80 text-sm text-slate-100 placeholder:text-slate-500"
                placeholder="Transcribing your question..."
              />
              <Button
                onClick={onSendQuestion}
                disabled={actionLoading === "send_q"}
                className="h-10 w-full bg-green-600 text-white shadow-lg hover:bg-green-700"
              >
                {actionLoading === "send_q" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Finish &amp; Save
                    Transcript
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
