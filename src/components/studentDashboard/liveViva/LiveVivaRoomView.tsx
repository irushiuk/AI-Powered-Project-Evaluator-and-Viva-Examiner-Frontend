"use client";

import type { Dispatch, SetStateAction } from "react";
import AgoraVideoRoom from "@/components/agora/AgoraVideoRoom";
import type { ScreenTrack } from "@/components/agora/components/AgoraRoomView";
import type {
  LiveQuestion,
  SessionTakeoverStatus,
} from "@/services/liveQuestionService";
import type { SessionPhase, VivaQuestion } from "@/types/vivaSession";
import { ExitVivaDialog } from "./components/ExitVivaDialog";
import {
  CollapsedQATab,
  VivaPanelControls,
} from "./components/VivaPanelControls";
import { VivaDemoRoom } from "./components/VivaDemoRoom";
import { VivaLobby } from "./components/VivaLobby";
import { VivaQAPanel } from "./components/VivaQAPanel";
import { VivaStatusScreen } from "./components/VivaStatusScreen";

interface LiveVivaRoomViewProps {
  sessionId: string;
  isExaminerView?: boolean;
  isLoading: boolean;
  loadError: string | null;
  hasFinished: boolean;
  phase: SessionPhase | "checking";
  demoEnabled: boolean;
  startingSession: boolean;
  endingDemo: boolean;
  currentQuestion: VivaQuestion | null;
  examinerQuestion: LiveQuestion | null;
  takeoverStatus: SessionTakeoverStatus | null;
  showQAPanel: boolean;
  setShowQAPanel: Dispatch<SetStateAction<boolean>>;
  isRecording: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
  recordingTime: number;
  micMuted: boolean;
  answerText: string;
  setAnswerText: Dispatch<SetStateAction<string>>;
  speechSupported: boolean;
  interimTranscript: string;
  isSubmitting: boolean;
  actionLoading: string | null;
  activePreemptiveId: string | null;
  examinerDraftText: string;
  setExaminerDraftText: Dispatch<SetStateAction<string>>;
  showExitConfirm: boolean;
  setShowExitConfirm: Dispatch<SetStateAction<boolean>>;
  handleLocalTracks: (videoTrack: unknown, audioTrack: unknown) => void;
  onScreenTrackChange: (track: ScreenTrack) => void;
  handleRetry: () => void;
  handleStartDemo: () => Promise<void>;
  handleStartViva: () => Promise<void>;
  handleEndDemo: () => Promise<void>;
  handleSkip: () => void;
  submitAnswer: (answer: string) => Promise<void>;
  handlePauseAI: () => Promise<void>;
  handleResumeAI: () => Promise<void>;
  handleEndSession: () => Promise<void>;
  handleStartExaminerQuestion: () => Promise<void>;
  handleSendExaminerQuestion: () => Promise<void>;
  handleMicToggle: (isMuted: boolean) => void;
  abortRecognition: () => void;
  onBack: () => void;
}

export function LiveVivaRoomView({
  sessionId,
  isExaminerView,
  isLoading,
  loadError,
  hasFinished,
  phase,
  demoEnabled,
  startingSession,
  endingDemo,
  currentQuestion,
  examinerQuestion,
  takeoverStatus,
  showQAPanel,
  setShowQAPanel,
  isRecording,
  isTranscribing,
  isSpeaking,
  recordingTime,
  micMuted,
  answerText,
  setAnswerText,
  speechSupported,
  interimTranscript,
  isSubmitting,
  actionLoading,
  activePreemptiveId,
  examinerDraftText,
  setExaminerDraftText,
  showExitConfirm,
  setShowExitConfirm,
  handleLocalTracks,
  onScreenTrackChange,
  handleRetry,
  handleStartDemo,
  handleStartViva,
  handleEndDemo,
  handleSkip,
  submitAnswer,
  handlePauseAI,
  handleResumeAI,
  handleEndSession,
  handleStartExaminerQuestion,
  handleSendExaminerQuestion,
  handleMicToggle,
  abortRecognition,
  onBack,
}: LiveVivaRoomViewProps) {
  if (isLoading) {
    return (
      <VivaStatusScreen
        variant="loading"
        isExaminerView={isExaminerView}
        isGeneratingQuestion={phase === "viva_in_progress"}
      />
    );
  }

  if (loadError) {
    return (
      <VivaStatusScreen
        variant="error"
        error={loadError}
        onBack={onBack}
        onRetry={handleRetry}
      />
    );
  }

  if (hasFinished) {
    return <VivaStatusScreen variant="complete" />;
  }

  if (phase === "scheduled" || phase === "ongoing" || phase === "live") {
    return (
      <VivaLobby
        sessionId={sessionId}
        phase={phase}
        demoEnabled={demoEnabled}
        startingSession={startingSession}
        onLocalTracks={handleLocalTracks}
        onStartDemo={handleStartDemo}
        onStartViva={handleStartViva}
      />
    );
  }

  if (phase === "demo_in_progress") {
    return (
      <VivaDemoRoom
        sessionId={sessionId}
        endingDemo={endingDemo}
        onLocalTracks={handleLocalTracks}
        onScreenTrackChange={onScreenTrackChange}
        onEndDemo={handleEndDemo}
      />
    );
  }

  if (!currentQuestion && !examinerQuestion) return null;

  const hasCurrentQuestion = Boolean(currentQuestion);

  return (
    <div className="relative h-full w-full">
      <ExitVivaDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        onConfirm={() => {
          window.speechSynthesis.cancel();
          abortRecognition();
          onBack();
        }}
      />

      <AgoraVideoRoom
        sessionId={sessionId}
        className="rounded-none border-0"
        extraControls={
          <VivaPanelControls
            panelOpen={showQAPanel}
            hasCurrentQuestion={hasCurrentQuestion}
            onTogglePanel={() => setShowQAPanel((open) => !open)}
            onExit={() => setShowExitConfirm(true)}
          />
        }
        onMicToggle={handleMicToggle}
        onLocalTracks={handleLocalTracks}
        hideEndCallButton
        initialMute={isExaminerView}
        initialCamOff={isExaminerView}
        remoteJoinNotice="Examiner joining now"
        overlayContent={
          <>
            <VivaQAPanel
              open={showQAPanel}
              isExaminerView={isExaminerView}
              currentQuestion={currentQuestion}
              examinerQuestion={examinerQuestion}
              takeoverStatus={takeoverStatus}
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              isSpeaking={isSpeaking}
              recordingTime={recordingTime}
              micMuted={micMuted}
              answerText={answerText}
              speechSupported={speechSupported}
              interimTranscript={interimTranscript}
              isSubmitting={isSubmitting}
              actionLoading={actionLoading}
              activePreemptiveId={activePreemptiveId}
              examinerDraftText={examinerDraftText}
              onClose={() => setShowQAPanel(false)}
              onAnswerChange={setAnswerText}
              onExaminerDraftChange={setExaminerDraftText}
              onSkip={handleSkip}
              onSubmitAnswer={submitAnswer}
              onPauseAI={handlePauseAI}
              onResumeAI={handleResumeAI}
              onEndSession={handleEndSession}
              onStartExaminerQuestion={handleStartExaminerQuestion}
              onSendExaminerQuestion={handleSendExaminerQuestion}
            />
            <CollapsedQATab
              visible={!showQAPanel}
              hasCurrentQuestion={hasCurrentQuestion}
              onOpen={() => setShowQAPanel(true)}
            />
          </>
        }
      />
    </div>
  );
}
