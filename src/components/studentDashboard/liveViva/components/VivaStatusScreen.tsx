"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VivaStatusScreenProps {
  variant: "loading" | "error" | "complete";
  isExaminerView?: boolean;
  isGeneratingQuestion?: boolean;
  error?: string;
  onBack?: () => void;
  onRetry?: () => void;
}

export function VivaStatusScreen({
  variant,
  isExaminerView,
  isGeneratingQuestion,
  error,
  onBack,
  onRetry,
}: VivaStatusScreenProps) {
  if (variant === "loading") {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 text-white">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <h2 className="text-2xl font-bold">
            {isExaminerView
              ? "Joining Live Viva Room"
              : isGeneratingQuestion
                ? "Starting Viva Session"
                : "Connecting to Room"}
          </h2>
          <p className="text-slate-400">
            {isExaminerView
              ? "Connecting to the live evaluation and fetching the current question..."
              : isGeneratingQuestion
                ? "Generating your first question from the evaluation rubric."
                : "Retrieving session details and setting up your media stream..."}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "error") {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 text-white">
        <div className="max-w-md space-y-5 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="text-2xl font-bold">Could Not Start Session</h2>
          <p className="text-slate-400">{error}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={onRetry}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-950 text-white">
      <div className="space-y-6 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold">Session Complete</h2>
        <p className="text-slate-400">
          Your answers were submitted. Redirecting you back to your sessions.
        </p>
      </div>
    </div>
  );
}
