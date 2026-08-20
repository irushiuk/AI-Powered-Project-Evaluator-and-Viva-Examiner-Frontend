"use client";

import { Mic, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  LiveQuestion,
  SessionTakeoverStatus,
} from "@/services/liveQuestionService";
import type { VivaQuestion } from "@/types/vivaSession";

interface QuestionStatusCardProps {
  currentQuestion: VivaQuestion | null;
  examinerQuestion: LiveQuestion | null;
  takeoverStatus: SessionTakeoverStatus | null;
  isRecording: boolean;
  isSpeaking: boolean;
  recordingTime: number;
  micMuted: boolean;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function QuestionStatusCard({
  currentQuestion,
  examinerQuestion,
  takeoverStatus,
  isRecording,
  isSpeaking,
  recordingTime,
  micMuted,
}: QuestionStatusCardProps) {
  const examinerHasControl = Boolean(
    examinerQuestion || takeoverStatus?.paused,
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {examinerQuestion ? (
          <Badge className="bg-amber-500/90 text-slate-950 hover:bg-amber-500">
            Question from Examiner
          </Badge>
        ) : currentQuestion ? (
          <>
            <Badge
              variant="outline"
              className="border-slate-700 text-slate-300"
            >
              Q{currentQuestion.question_number}
            </Badge>
            <Badge
              variant="outline"
              className="border-slate-700 text-slate-300"
            >
              {currentQuestion.criterion}
            </Badge>
            <Badge variant="secondary" className="text-slate-300">
              {currentQuestion.blooms_level}
            </Badge>
            <Badge variant="secondary" className="text-slate-300">
              {currentQuestion.difficulty}
            </Badge>
          </>
        ) : null}
      </div>

      <div
        className={`rounded-xl border p-4 transition-colors duration-500 ${
          examinerHasControl
            ? "border-amber-500/60 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            : isRecording
              ? "border-red-500/50 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
              : isSpeaking
                ? "border-blue-500/50 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                : "border-slate-800 bg-slate-900/50"
        }`}
      >
        <div className="mb-3 flex items-center gap-2">
          {isSpeaking ? (
            <Volume2 className="h-5 w-5 shrink-0 animate-pulse text-blue-400" />
          ) : isRecording ? (
            <Mic className="h-5 w-5 shrink-0 animate-pulse text-red-500" />
          ) : (
            <VolumeX className="h-5 w-5 shrink-0 text-slate-500" />
          )}
          <span className="text-xs text-slate-400">
            {takeoverStatus?.paused &&
              !examinerQuestion &&
              "AI is paused. Waiting for Examiner..."}
            {!takeoverStatus?.paused &&
              isSpeaking &&
              "AI Examiner is speaking..."}
            {takeoverStatus?.paused &&
              examinerQuestion &&
              "Examiner is speaking..."}
            {!takeoverStatus?.paused && isRecording && (
              <span className="font-medium text-red-400">
                Transcribing: {formatTime(recordingTime)}
              </span>
            )}
            {!takeoverStatus?.paused && !isSpeaking && !isRecording && (
              <span className="text-slate-500">
                {micMuted
                  ? "Unmute your mic to answer"
                  : "Starting to listen..."}
              </span>
            )}
          </span>
        </div>

        {examinerHasControl ? (
          <div className="py-2">
            <p className="text-base font-medium leading-relaxed text-amber-500">
              The examiner has taken over the session to ask you a question
              directly.
            </p>
            <p className="mt-2 text-xs text-amber-400/70">
              Please listen to the examiner and speak your answer.
            </p>
          </div>
        ) : (
          <p className="text-base font-medium leading-relaxed text-slate-100">
            {currentQuestion?.question_text || ""}
          </p>
        )}
      </div>
    </>
  );
}
