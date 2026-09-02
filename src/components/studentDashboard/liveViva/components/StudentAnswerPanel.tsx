"use client";

import { CheckCircle2, Loader2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { appendTranscript } from "../utils/liveVivaUtils";

interface StudentAnswerPanelProps {
  answerText: string;
  interimTranscript: string;
  /** A recorded utterance is with the transcription service right now. */
  isTranscribing: boolean;
  isRecording: boolean;
  speechSupported: boolean;
  isSubmitting: boolean;
  examinerQuestionActive: boolean;
  examinerQuestionInProgress: boolean;
  aiPaused: boolean;
  onAnswerChange: (answer: string) => void;
  onSkip: () => void;
  onSubmit: (answer: string) => Promise<void>;
}

export function StudentAnswerPanel({
  answerText,
  interimTranscript,
  isTranscribing,
  isRecording,
  speechSupported,
  isSubmitting,
  examinerQuestionActive,
  examinerQuestionInProgress,
  aiPaused,
  onAnswerChange,
  onSkip,
  onSubmit,
}: StudentAnswerPanelProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="answer-text" className="text-xs text-slate-400">
          Answer transcript
        </Label>
        <Textarea
          id="answer-text"
          value={answerText}
          onChange={(event) => onAnswerChange(event.target.value)}
          placeholder={
            speechSupported
              ? "Your speech will appear here. You can also type or edit."
              : "Speech recognition unavailable. Type your answer."
          }
          className="min-h-24 resize-none border-slate-800 bg-slate-900/50 text-sm text-slate-100 placeholder:text-slate-600"
          disabled={isSubmitting || examinerQuestionInProgress || (aiPaused && !examinerQuestionActive)}
        />
        {interimTranscript ? (
          <p className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
            Listening: {interimTranscript}
          </p>
        ) : isTranscribing ? (
          <p className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Transcribing what you just said…
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onSkip}
          disabled={isSubmitting || examinerQuestionActive || examinerQuestionInProgress || aiPaused}
          className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <SkipForward className="mr-1.5 h-3.5 w-3.5" />
          Skip
        </Button>

        <Button
          size="sm"
          onClick={() =>
            onSubmit(appendTranscript(answerText, interimTranscript))
          }
          disabled={
            isSubmitting || examinerQuestionInProgress ||
            (aiPaused && !examinerQuestionActive) ||
            (isTranscribing && !isRecording) ||
            (!answerText.trim() && !interimTranscript.trim() && !isTranscribing)
          }
          className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{" "}
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Submit Answer
            </>
          )}
        </Button>
      </div>
    </>
  );
}
