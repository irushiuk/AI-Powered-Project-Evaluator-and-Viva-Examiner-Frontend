"use client";

import { MessageSquareText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  LiveQuestion,
  SessionTakeoverStatus,
} from "@/services/liveQuestionService";
import type { VivaQuestion } from "@/types/vivaSession";
import { ExaminerTakeoverPanel } from "./ExaminerTakeoverPanel";
import { QuestionStatusCard } from "./QuestionStatusCard";
import { StudentAnswerPanel } from "./StudentAnswerPanel";

interface VivaQAPanelProps {
  open: boolean;
  isExaminerView?: boolean;
  currentQuestion: VivaQuestion | null;
  examinerQuestion: LiveQuestion | null;
  takeoverStatus: SessionTakeoverStatus | null;
  isRecording: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
  recordingTime: number;
  micMuted: boolean;
  answerText: string;
  speechSupported: boolean;
  interimTranscript: string;
  isSubmitting: boolean;
  actionLoading: string | null;
  activePreemptiveId: string | null;
  examinerDraftText: string;
  onClose: () => void;
  onAnswerChange: (answer: string) => void;
  onExaminerDraftChange: (text: string) => void;
  onSkip: () => void;
  onSubmitAnswer: (answer: string) => Promise<void>;
  onPauseAI: () => Promise<void>;
  onResumeAI: () => Promise<void>;
  onEndSession: () => Promise<void>;
  onStartExaminerQuestion: () => Promise<void>;
  onSendExaminerQuestion: () => Promise<void>;
}

export function VivaQAPanel({
  open,
  isExaminerView,
  currentQuestion,
  examinerQuestion,
  takeoverStatus,
  isRecording,
  isTranscribing,
  isSpeaking,
  recordingTime,
  micMuted,
  answerText,
  speechSupported,
  interimTranscript,
  isSubmitting,
  actionLoading,
  activePreemptiveId,
  examinerDraftText,
  onClose,
  onAnswerChange,
  onExaminerDraftChange,
  onSkip,
  onSubmitAnswer,
  onPauseAI,
  onResumeAI,
  onEndSession,
  onStartExaminerQuestion,
  onSendExaminerQuestion,
}: VivaQAPanelProps) {
  return (
    <div
      className={`absolute top-0 right-0 bottom-[72px] z-30 flex w-[500px] max-w-full flex-col
        border-l border-slate-800/60 bg-slate-950/90 backdrop-blur-xl
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-slate-200">
            Viva Q&amp;A
          </span>
          <Badge
            variant={isRecording ? "destructive" : "secondary"}
            className="px-1.5 py-0 text-[10px]"
          >
            {isRecording ? "REC" : "Live"}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          aria-label="Close Q&A panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <QuestionStatusCard
          currentQuestion={currentQuestion}
          examinerQuestion={examinerQuestion}
          takeoverStatus={takeoverStatus}
          isRecording={isRecording}
          isSpeaking={isSpeaking}
          recordingTime={recordingTime}
          micMuted={micMuted}
        />

        {!isExaminerView && (
          <StudentAnswerPanel
            answerText={answerText}
            interimTranscript={interimTranscript}
            isTranscribing={isTranscribing}
            speechSupported={speechSupported}
            isSubmitting={isSubmitting}
            examinerQuestionActive={Boolean(examinerQuestion)}
            aiPaused={Boolean(takeoverStatus?.paused)}
            onAnswerChange={onAnswerChange}
            onSkip={onSkip}
            onSubmit={onSubmitAnswer}
          />
        )}

        {isExaminerView && (
          <ExaminerTakeoverPanel
            takeoverStatus={takeoverStatus}
            actionLoading={actionLoading}
            activePreemptiveId={activePreemptiveId}
            examinerDraftText={examinerDraftText}
            onDraftChange={onExaminerDraftChange}
            onPauseAI={onPauseAI}
            onResumeAI={onResumeAI}
            onEndSession={onEndSession}
            onStartQuestion={onStartExaminerQuestion}
            onSendQuestion={onSendExaminerQuestion}
          />
        )}
      </div>
    </div>
  );
}
