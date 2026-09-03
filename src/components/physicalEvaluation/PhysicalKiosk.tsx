y"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock3,
  Expand,
  Loader2,
  LockKeyhole,
  MapPin,
  Mic,
  MicOff,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  UserRound,
  UsersRound,
  Video,
  Volume2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import PhysioBandPanel from "@/components/physicalEvaluation/PhysioBandPanel";
import { physicalEvaluationService } from "@/services/physicalEvaluationService";
import type {
  PhysicalRun,
  PhysicalIdentityReview,
  PhysicalSubmitVivaAnswerResponse,
  PhysicalSession,
  PhysicalSessionList,
} from "@/types/physicalEvaluation";
import type { VivaQuestion } from "@/types/vivaSession";
import {
  useReliableLiveSpeakerDetection,
  type SeatBinding,
} from "@/components/physicalEvaluation/hooks/useReliableLiveSpeakerDetection";
import { usePhysicalSessionRecorder } from "@/components/physicalEvaluation/hooks/usePhysicalSessionRecorder";
import {
  useSpeechDictation,
  type DictationTranscriber,
  type DictationUnavailableReason,
} from "@/hooks/useSpeechDictation";
import { captureBindingFrames } from "@/components/physicalEvaluation/hooks/captureBindingFrames";
import { usePhysicalQuestionSpeech } from "@/components/physicalEvaluation/hooks/usePhysicalQuestionSpeech";

type KioskPhase =
  | "loading"
  | "locked"
  | "list"
  | "preparing"
  | "identity_review"
  | "sensor_setup"
  | "demo"
  | "viva"
  | "finalizing"
  | "finish_error"
  | "complete";

type AnswerProgress = "idle" | "evaluating" | "taking_longer";

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

async function requestWithTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  milliseconds: number,
  timeoutMessage: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), milliseconds);
  try {
    return await request(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) throw new Error(timeoutMessage, { cause: error });
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function submitAnswerWithRecovery(
  sessionId: string,
  questionId: string,
  answerText: string,
  speakerId: string,
): Promise<PhysicalSubmitVivaAnswerResponse> {
  type SubmissionOutcome =
    | { kind: "response"; value: PhysicalSubmitVivaAnswerResponse }
    | { kind: "error"; error: unknown }
    | { kind: "waiting" };

  const directResult: Promise<SubmissionOutcome> = physicalEvaluationService
    .submitAnswer(sessionId, questionId, answerText, speakerId)
    .then((value) => ({ kind: "response" as const, value }))
    .catch((error: unknown) => ({ kind: "error" as const, error }));

  let outcome = await Promise.race<SubmissionOutcome>([
    directResult,
    wait(8_000).then(() => ({ kind: "waiting" as const })),
  ]);
  if (outcome.kind === "response") return outcome.value;

  // The evaluator may commit the turn even when its HTTP response is delayed
  // or lost. Poll read-only state instead of resubmitting the answer.
  const recoveryDeadline = Date.now() + 120_000;
  for (
    let attempt = 0;
    attempt < 55 && Date.now() < recoveryDeadline;
    attempt += 1
  ) {
    try {
      const current = await requestWithTimeout(
        (signal) => physicalEvaluationService.getCurrentQuestion(sessionId, signal),
        8_000,
        "Session status check timed out.",
      );
      if (current.session_complete) {
        return {
          answer_saved: true,
          session_complete: true,
          message: "The final answer was saved and the viva is complete.",
        };
      }
      if (current.question && current.question.question_id !== questionId) {
        return {
          answer_saved: true,
          session_complete: false,
          next_question: current.question,
          message: "Answer submitted.",
        };
      }
    } catch {
      // A brief read failure should not cause the already-running submission
      // to be sent twice. The next polling interval will retry safely.
    }

    if (outcome.kind === "error") {
      throw outcome.error;
    }
    outcome = await Promise.race<SubmissionOutcome>([
      directResult,
      wait(2_000).then(() => ({ kind: "waiting" as const })),
    ]);
    if (outcome.kind === "response") return outcome.value;
  }

  throw new Error(
    "Answer evaluation is taking longer than expected. Your answer may already be saved; please wait and use Retry status instead of submitting it again.",
  );
}

type SpeechResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechEvent = Event & {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function sessionTitle(session: PhysicalSession): string {
  return (
    session.group?.group_name ||
    session.student?.full_name ||
    "Scheduled participant"
  );
}

function registrationLabel(session: PhysicalSession): string {
  if (session.student) return session.student.registration_number;
  if (session.group) {
    return session.group.members
      .map((member) => member.registration_number)
      .join(", ");
  }
  return "";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function PhysicalKiosk() {
  const router = useRouter();
  const [phase, setPhase] = useState<KioskPhase>("loading");
  const [panel, setPanel] = useState<PhysicalSessionList | null>(null);
  const [sessions, setSessions] = useState<PhysicalSession[]>([]);
  const [selectedSession, setSelectedSession] =
    useState<PhysicalSession | null>(null);
  const [activeSession, setActiveSession] = useState<PhysicalSession | null>(
    null,
  );
  const [question, setQuestion] = useState<VivaQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [speakerId, setSpeakerId] = useState("group");
  // Face recognition status for this room, shown so the examiner knows whether
  // answers will be credited automatically or need the dropdown.
  const [missingEnrollment, setMissingEnrollment] = useState<string[]>([]);
  const [seatBindings, setSeatBindings] = useState<SeatBinding[]>([]);
  const [faceBindingStatus, setFaceBindingStatus] = useState<
    "idle" | "scanning" | "ready" | "partial" | "failed"
  >("idle");
  const [faceBindingError, setFaceBindingError] = useState("");
  const [identityReview, setIdentityReview] =
    useState<PhysicalIdentityReview | null>(null);
  const [identityOverrideAccepted, setIdentityOverrideAccepted] = useState(false);
  const [identityOverridePin, setIdentityOverridePin] = useState("");
  const [identityOverrideReason, setIdentityOverrideReason] = useState("");
  const [nextEvaluationPhase, setNextEvaluationPhase] =
    useState<"demo" | "viva">("viva");
  const [busy, setBusy] = useState(false);
  const [answerProgress, setAnswerProgress] =
    useState<AnswerProgress>("idle");
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isBrowserListening, setIsBrowserListening] = useState(false);
  // ElevenLabs Scribe transcribes answers; the browser recogniser is only the
  // fallback for an outage, since its accuracy is noticeably worse.
  const [dictationMode, setDictationMode] =
    useState<"provider" | "browser">("provider");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showClosePanel, setShowClosePanel] = useState(false);
  const [closePin, setClosePin] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const providerErrorsRef = useRef(0);
  const bootstrappedRef = useRef(false);
  const bindingInFlightRef = useRef<{
    sessionId: string;
    promise: Promise<PhysicalIdentityReview | null>;
  } | null>(null);
  const studentNames = useMemo(
    () => Object.fromEntries(
      activeSession?.group?.members.map((member) => [member.student_id, member.full_name]) || [],
    ),
    [activeSession],
  );
  const recognizedStudentNames = useMemo(
    () => [...new Set(
      seatBindings
        .map((binding) => binding.student_id ? studentNames[binding.student_id] : null)
        .filter((name): name is string => Boolean(name)),
    )],
    [seatBindings, studentNames],
  );
  const sessionRecorder = usePhysicalSessionRecorder();

  const attachPreview = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && mediaStream) {
        node.srcObject = mediaStream;
        void node.play().catch(() => undefined);
      }
    },
    [mediaStream],
  );

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      if (mediaStream) void videoRef.current.play().catch(() => undefined);
    }
  }, [mediaStream]);

  const transcribeAnswer = useCallback<DictationTranscriber>(
    (audio, signal) => {
      const sessionId = activeSession?.session_id;
      if (!sessionId) return Promise.resolve({ text: "", stt_status: "failed" as const });
      return physicalEvaluationService.transcribeAnswerAudio(sessionId, audio, signal);
    },
    [activeSession?.session_id],
  );

  const handleDictationUnavailable = useCallback(
    (reason: DictationUnavailableReason) => {
      if (reason === "mic-blocked") {
        toast.error("The microphone is blocked. Type the answer instead.");
        return;
      }
      if (reason === "provider-error") {
        providerErrorsRef.current += 1;
        if (providerErrorsRef.current < 2) return;
      }
      setDictationMode("browser");
    },
    [],
  );

  const {
    isListening: isProviderListening,
    isTranscribing,
    start: startDictation,
    stop: stopDictation,
    abort: abortDictation,
  } = useSpeechDictation({
    transcribe: transcribeAnswer,
    onFinalTranscript: (text) => {
      providerErrorsRef.current = 0;
      setAnswer((current) => `${current}${current ? " " : ""}${text}`);
    },
    onUnavailable: handleDictationUnavailable,
  });

  const isListening =
    dictationMode === "provider" ? isProviderListening : isBrowserListening;

  const stopSpeechRecognition = useCallback(() => {
    abortDictation();
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // Already stopped by the browser.
      }
      speechRecognitionRef.current = null;
    }
    setIsBrowserListening(false);
  }, [abortDictation]);

  /**
   * Ends dictation and folds in whatever Scribe still owes us, so pressing
   * Stop or Submit never drops the last sentence.
   */
  const finishListening = useCallback(async (): Promise<string> => {
    if (dictationMode === "provider") return stopDictation();
    stopSpeechRecognition();
    return "";
  }, [dictationMode, stopDictation, stopSpeechRecognition]);

  // Dropping to the browser recogniser must release the recorder first, or two
  // captures fight over the same microphone.
  useEffect(() => {
    if (dictationMode === "browser") abortDictation();
  }, [abortDictation, dictationMode]);

  const {
    isSpeaking: isQuestionSpeaking,
    replay: replayQuestion,
    cancel: cancelQuestionSpeech,
  } = usePhysicalQuestionSpeech({
    enabled: phase === "viva",
    sessionId: activeSession?.session_id || null,
    question,
    onPlaybackStart: stopSpeechRecognition,
  });

  const liveSpeaker = useReliableLiveSpeakerDetection({
    enabled:
      Boolean(activeSession?.group) &&
      seatBindings.some((binding) => Boolean(binding.student_id)) &&
      ["preparing", "identity_review", "sensor_setup", "demo", "viva"].includes(phase),
    // Keep face tracks warm in every post-binding phase. Only create scoring
    // evidence during an active answer window.
    paused: isQuestionSpeaking || phase !== "viva" || busy,
    sessionId: activeSession?.session_id || null,
    videoRef,
    stream: mediaStream,
    bindings: seatBindings,
    names: studentNames,
    maxFaces: activeSession?.group?.members.length || 1,
    persistEvidence: phase === "viva",
  });

  const startCamera = useCallback(async () => {
    const existingStream = mediaStreamRef.current;
    if (existingStream?.active) {
      setMediaStream(existingStream);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support camera access.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    mediaStreamRef.current = stream;
    setMediaStream(stream);
  }, []);

  const startProtectedRecording = useCallback(
    async (
      session: PhysicalSession,
      resume: {
        nextChunkIndex?: number;
        startedAt?: string | number;
      } = {},
    ) => {
      await startCamera();
      const stream = mediaStreamRef.current;
      if (!stream) {
        throw new Error("The room camera is not available for recording.");
      }
      const startedAt = sessionRecorder.start(
        session.session_id,
        stream,
        resume,
      );
      if (!startedAt) {
        throw new Error("This browser could not start the room recording.");
      }
      await physicalEvaluationService.startRecording(
        session.session_id,
        new Date(startedAt).toISOString(),
      );
      return startedAt;
    },
    [sessionRecorder, startCamera],
  );

  const stopCamera = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setMediaStream(null);
  }, []);

  const loadSessions = useCallback(async () => {
    const data = await physicalEvaluationService.listSessions();
    setPanel(data);
    setSessions(data.sessions);
    return data;
  }, []);

  const finalizeEvaluation = useCallback(
    async (sessionId: string) => {
      stopSpeechRecognition();
      cancelQuestionSpeech();
      setPhase("finalizing");
      try {
        await sessionRecorder.beginBackgroundFinalization(sessionId);
        stopCamera();
        await loadSessions();
        setPhase("complete");
      } catch (finalizeError) {
        stopCamera();
        setError(
          finalizeError instanceof Error
            ? `The answers are saved, but the recording could not be finalized: ${finalizeError.message}`
            : "The answers are saved, but the recording could not be finalized.",
        );
        setPhase("finish_error");
      }
    },
    [
      loadSessions,
      cancelQuestionSpeech,
      sessionRecorder,
      stopCamera,
      stopSpeechRecognition,
    ],
  );

  const recoverServerRecording = useCallback(
    async (sessionId: string, retryFinalization: boolean) => {
      stopSpeechRecognition();
      cancelQuestionSpeech();
      stopCamera();
      setPhase("finalizing");
      try {
        let status = await requestWithTimeout(
          (signal) => physicalEvaluationService.getRecordingStatus(sessionId, signal),
          10_000,
          "Recording status check timed out.",
        );
        if (retryFinalization && status.status !== "ready") {
          const totalChunks =
            status.expected_chunks ??
            (status.uploaded_chunk_indices.length
              ? Math.max(...status.uploaded_chunk_indices) + 1
              : status.uploaded_chunks);
          if (!totalChunks || !status.duration_seconds) {
            throw new Error(
              "The recording does not contain enough upload metadata to retry safely.",
            );
          }
          status = await requestWithTimeout(
            (signal) => physicalEvaluationService.finalizeChunkedRecording(
              sessionId,
              totalChunks,
              status.duration_seconds!,
              status.mime_type || "video/webm",
              signal,
            ),
            30_000,
            "Recording finalization request timed out.",
          );
        }

        for (let attempt = 0; status.status !== "ready" && attempt < 30; attempt += 1) {
          if (status.status === "failed") {
            throw new Error(status.error_message || "Recording finalization failed.");
          }
          await wait(2_000);
          status = await requestWithTimeout(
            (signal) => physicalEvaluationService.getRecordingStatus(sessionId, signal),
            10_000,
            "Recording status check timed out.",
          );
        }
        if (status.status !== "ready") {
          throw new Error(
            "Recording finalization is still running. Please retry status shortly.",
          );
        }
        await loadSessions();
        setPhase("complete");
      } catch (recordingError) {
        setError(
          recordingError instanceof Error
            ? `The answers are saved, but the recording is not ready: ${recordingError.message}`
            : "The answers are saved, but the recording is not ready.",
        );
        setPhase("finish_error");
      }
    },
    [
      cancelQuestionSpeech,
      loadSessions,
      stopCamera,
      stopSpeechRecognition,
    ],
  );

  /**
   * Sample a short camera burst and ask the backend to match each face against
   * the group's enrolment photos. Multi-frame voting tolerates normal seating
   * depth, short head turns and blinking.
   *
   * Recognition is expensive but only changes when someone moves seats, so it
   * runs here — once, at the start — rather than per frame. The result is
   * blocking: the roster must be complete or the examiner must explicitly
   * authorize an override from the identity-review screen.
   */
  const bindSeats = useCallback((sessionId: string): Promise<PhysicalIdentityReview | null> => {
    const inFlight = bindingInFlightRef.current;
    if (inFlight?.sessionId === sessionId) return inFlight.promise;

    const promise = (async () => {
      setFaceBindingStatus("scanning");
      setFaceBindingError("");
      let video = videoRef.current;
      for (let attempt = 0; attempt < 20 && (!video || !video.videoWidth); attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
        video = videoRef.current;
      }
      if (!video || !video.videoWidth) {
        setFaceBindingStatus("failed");
        setFaceBindingError("The camera preview was not ready. Please retry identification.");
        return null;
      }

      try {
        const frames = await captureBindingFrames(video);
        const result = await physicalEvaluationService.bindSeats(sessionId, frames);
        setIdentityReview(result);
        setSeatBindings(result.bindings);
        setMissingEnrollment(result.missing_enrollment ?? []);
        if (result.complete) {
          setFaceBindingStatus("ready");
          return result;
        }
        if (result.partial || result.can_continue) {
          setFaceBindingStatus("partial");
          return result;
        }
        setFaceBindingStatus("failed");
        setFaceBindingError(
          result.error || "Every expected member must be verified and extra faces must leave the frame.",
        );
        return result;
      } catch (bindingError) {
        setSeatBindings([]);
        setIdentityReview(null);
        setFaceBindingStatus("failed");
        setFaceBindingError(
          bindingError instanceof Error
            ? bindingError.message
            : "Student identification failed. Please retry.",
        );
        return null;
      }
    })();

    bindingInFlightRef.current = { sessionId, promise };
    void promise.finally(() => {
      if (bindingInFlightRef.current?.promise === promise) {
        bindingInFlightRef.current = null;
      }
    });
    return promise;
  }, []);

  const beginViva = useCallback(
    async (session: PhysicalSession) => {
      setBusy(true);
      setError("");
      try {
        // Capture begins immediately before the assessed viva boundary, not
        // while the student is completing identity and sensor setup.
        await startProtectedRecording(session);
        const firstQuestion = await physicalEvaluationService.startViva(
          session.session_id,
        );
        setQuestion(firstQuestion);
        setAnswer("");
        setFeedbackMessage(firstQuestion.message || "");
        setSpeakerId(session.student?.student_id || "group");
        setPhase("viva");
      } catch (vivaError) {
        setError(
          vivaError instanceof Error
            ? vivaError.message
            : "Failed to start the AI viva",
        );
        setPhase(session.demo_enabled ? "demo" : "preparing");
      } finally {
        setBusy(false);
      }
    },
    [startProtectedRecording],
  );

  const submitIdentityOverride = useCallback(async () => {
    if (!activeSession || busy) return;
    setBusy(true);
    setFaceBindingError("");
    try {
      await physicalEvaluationService.overrideIdentity(
        activeSession.session_id,
        identityOverridePin,
        identityOverrideReason,
      );
      setIdentityOverrideAccepted(true);
      setIdentityOverridePin("");
    } catch (overrideError) {
      setFaceBindingError(
        overrideError instanceof Error
          ? overrideError.message
          : "The examiner override could not be recorded.",
      );
    } finally {
      setBusy(false);
    }
  }, [activeSession, busy, identityOverridePin, identityOverrideReason]);

  const continueAfterIdentityReview = useCallback(() => {
    if (!(identityReview?.can_continue ?? identityReview?.complete) && !identityOverrideAccepted) return;
    void liveSpeaker.activateAudio();
    setPhase("sensor_setup");
  }, [identityOverrideAccepted, identityReview, liveSpeaker]);

  const continueAfterSensorSetup = useCallback(async () => {
    if (!activeSession) return;
    await liveSpeaker.activateAudio();
    if (nextEvaluationPhase === "demo") {
      setBusy(true);
      setError("");
      try {
        await startProtectedRecording(activeSession);
        setPhase("demo");
      } catch (recordingError) {
        setError(
          recordingError instanceof Error
            ? recordingError.message
            : "Failed to start the room recording",
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    await beginViva(activeSession);
  }, [activeSession, beginViva, liveSpeaker, nextEvaluationPhase, startProtectedRecording]);

  const resumeActiveRun = useCallback(
    async (run: PhysicalRun) => {
      setActiveSession(run.session);
      setSpeakerId(run.session.student?.student_id || "group");

      if (
        run.status === "recording_uploading" ||
        run.status === "recording_failed"
      ) {
        await recoverServerRecording(
          run.session.session_id,
          run.status === "recording_failed",
        );
        return;
      }

      setPhase("preparing");
      await startCamera();
      if (run.recording_started_at) {
        const uploadedIndices = run.recording_upload?.uploaded_chunk_indices ?? [];
        await startProtectedRecording(run.session, {
          nextChunkIndex: uploadedIndices.length
            ? Math.max(...uploadedIndices) + 1
            : run.recording_upload?.uploaded_chunks ?? 0,
          startedAt: run.recording_started_at,
        });
      }

      if (run.session.group && run.identity_status === "pending") {
        setNextEvaluationPhase(
          run.status === "demo_in_progress" ? "demo" : "viva",
        );
        await bindSeats(run.session.session_id);
        setPhase("identity_review");
        return;
      }
      if (run.session.group) {
        const stored = run.identity_verification as PhysicalIdentityReview;
        if (Array.isArray(stored?.roster)) {
          setIdentityReview(stored);
          setSeatBindings(stored.bindings || []);
          setMissingEnrollment(stored.missing_enrollment || []);
          setFaceBindingStatus(
            run.identity_status === "verified"
              ? "ready"
              : run.identity_status === "partial"
                ? "partial"
                : "failed",
          );
        }
        setIdentityOverrideAccepted(run.identity_status === "overridden");
      }

      if (run.status === "demo_in_progress") {
        if (!run.recording_started_at) {
          await startProtectedRecording(run.session);
        }
        setPhase("demo");
        return;
      }

      const current = await requestWithTimeout(
        (signal) => physicalEvaluationService.getCurrentQuestion(
          run.session.session_id,
          signal,
        ),
        10_000,
        "Current-question recovery timed out.",
      );
      if (current.session_complete) {
        await finalizeEvaluation(run.session.session_id);
        return;
      }
      if (current.question) {
        setQuestion(current.question);
        setPhase("viva");
        return;
      }
      await beginViva(run.session);
    },
    [
      beginViva,
      bindSeats,
      finalizeEvaluation,
      recoverServerRecording,
      startCamera,
      startProtectedRecording,
    ],
  );

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const bootstrap = async () => {
      if (!physicalEvaluationService.hasKioskToken()) {
        setPhase("locked");
        return;
      }
      try {
        await loadSessions();
        const activeRun = await physicalEvaluationService.getActiveRun();
        if (activeRun) {
          await resumeActiveRun(activeRun);
        } else {
          setPhase("list");
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load the physical panel",
        );
        setPhase(physicalEvaluationService.hasKioskToken() ? "list" : "locked");
      }
    };

    void bootstrap();
  }, [loadSessions, resumeActiveRun]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreen = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  const evaluationActive = [
    "preparing",
    "identity_review",
    "sensor_setup",
    "demo",
    "viva",
    "finalizing",
    "finish_error",
  ].includes(phase);

  useEffect(() => {
    if (!evaluationActive) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [evaluationActive]);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.abort();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startSelectedSession = async () => {
    const session = selectedSession;
    if (!session || busy) return;
    setBusy(true);
    setError("");
    setActiveSession(session);
    setSeatBindings([]);
    setMissingEnrollment([]);
    setFaceBindingStatus("idle");
    setFaceBindingError("");
    setIdentityReview(null);
    setIdentityOverrideAccepted(false);
    setIdentityOverridePin("");
    setIdentityOverrideReason("");
    setSelectedSession(null);
    setPhase("preparing");

    try {
      // Camera preview starts for identity/sensor setup. Protected recording
      // begins later, at the demo or viva boundary.
      await startCamera();
      const run = await physicalEvaluationService.startSession(
        session.session_id,
      );
      setActiveSession(run.session);
      setSpeakerId(run.session.student?.student_id || "group");
      const requestedNextPhase = (
        run.next_action === "start_demo" ||
        run.status === "demo_in_progress"
      ) ? "demo" : "viva";
      setNextEvaluationPhase(requestedNextPhase);
      if (run.session.group) {
        await bindSeats(run.session.session_id);
        setPhase("identity_review");
      } else {
        // Identity selection and heart-rate wearer selection are deliberately
        // separate. Individuals skip face review but still see band setup.
        setPhase("sensor_setup");
      }
    } catch (startError) {
      // The backend may have committed the run even if the response was lost
      // or a later client step failed. Recover that run without returning the
      // student to a stale session list or stopping the active camera.
      try {
        const activeRun = await physicalEvaluationService.getActiveRun();
        if (activeRun?.session.session_id === session.session_id) {
          setError("");
          await resumeActiveRun(activeRun);
          return;
        }
      } catch {
        // Preserve the original start error if recovery is unavailable.
      }
      stopCamera();
      setActiveSession(null);
      setError(
        startError instanceof Error
          ? startError.message
          : "Failed to start the evaluation",
      );
      setPhase("list");
    } finally {
      setBusy(false);
    }
  };

  const finishDemo = async () => {
    if (!activeSession || busy) return;
    await liveSpeaker.activateAudio();
    setBusy(true);
    setError("");
    try {
      await physicalEvaluationService.completeDemo(activeSession.session_id);
      await beginViva(activeSession);
    } catch (demoError) {
      setError(
        demoError instanceof Error
          ? demoError.message
          : "Failed to move to the viva",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (!activeSession || !question || busy || isQuestionSpeaking) return;

    // Scribe may still hold the last sentence; it belongs in this submission.
    const pending = isListening ? await finishListening() : "";
    const finalAnswer = `${answer}${answer && pending ? " " : ""}${pending}`.trim();
    if (!finalAnswer) return;
    if (pending) setAnswer(finalAnswer);
    stopSpeechRecognition();
    setBusy(true);
    setAnswerProgress("evaluating");
    setError("");
    setFeedbackMessage("");
    const slowTimer = window.setTimeout(
      () => setAnswerProgress("taking_longer"),
      8_000,
    );
    try {
      if (activeSession.group) await liveSpeaker.flush();
      const result = await submitAnswerWithRecovery(
        activeSession.session_id,
        question.question_id,
        finalAnswer,
        activeSession.group ? "group" : speakerId,
      );
      if (result.session_complete) {
        setFeedbackMessage(result.message || "The viva is complete.");
        await finalizeEvaluation(activeSession.session_id);
        return;
      }
      if (!result.next_question) {
        throw new Error(
          "The evaluator did not return the next question. Please try again.",
        );
      }
      setQuestion(result.next_question);
      setAnswer("");
      setFeedbackMessage(
        result.message ||
          (result.clarification
            ? "The question has been clarified."
            : "Answer submitted."),
      );
    } catch (answerError) {
      setError(
        answerError instanceof Error
          ? answerError.message
          : "Failed to submit the answer",
      );
    } finally {
      window.clearTimeout(slowTimer);
      setAnswerProgress("idle");
      setBusy(false);
    }
  };

  const startListening = () => {
    if (isQuestionSpeaking) {
      toast.info("Wait until the question has finished playing.");
      return;
    }
    if (isListening) {
      void finishListening().then((pending) => {
        if (pending) setAnswer((current) => `${current}${current ? " " : ""}${pending}`);
      });
      return;
    }
    if (dictationMode === "provider") {
      void startDictation();
      return;
    }
    void liveSpeaker.activateAudio();
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Constructor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      toast.error(
        "Speech input is not supported in this browser. Please type the answer.",
      );
      return;
    }

    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        if (event.results[index].isFinal)
          transcript += `${event.results[index][0].transcript} `;
      }
      if (transcript) {
        setAnswer(
          (current) => `${current}${current ? " " : ""}${transcript.trim()}`,
        );
      }
    };
    recognition.onend = () => {
      speechRecognitionRef.current = null;
      setIsBrowserListening(false);
    };
    recognition.onerror = () => {
      speechRecognitionRef.current = null;
      setIsBrowserListening(false);
      toast.error("Speech input stopped. You can continue by typing.");
    };
    speechRecognitionRef.current = recognition;
    recognition.start();
    setIsBrowserListening(true);
  };

  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement)
        await document.documentElement.requestFullscreen();
    } catch {
      toast.error(
        "Full screen could not be enabled. Use your browser's full-screen control.",
      );
    }
  };

  const closePanel = async () => {
    if (!closePin || busy) return;
    setBusy(true);
    setError("");
    try {
      await physicalEvaluationService.closeKiosk(closePin);
      router.replace("/login");
    } catch (closeError) {
      setError(
        closeError instanceof Error
          ? closeError.message
          : "Failed to close the panel",
      );
      setBusy(false);
    }
  };

  const retryFinish = async () => {
    if (!activeSession || busy) return;
    setBusy(true);
    setError("");
    if (sessionRecorder.finalizationStage === "idle") {
      await recoverServerRecording(activeSession.session_id, true);
    } else {
      await finalizeEvaluation(activeSession.session_id);
    }
    setBusy(false);
  };

  const returnToSessions = () => {
    cancelQuestionSpeech();
    sessionRecorder.abandon();
    stopCamera();
    setActiveSession(null);
    setQuestion(null);
    setAnswer("");
    setAnswerProgress("idle");
    setFeedbackMessage("");
    setSeatBindings([]);
    setMissingEnrollment([]);
    setFaceBindingStatus("idle");
    setFaceBindingError("");
    setIdentityReview(null);
    setIdentityOverrideAccepted(false);
    setIdentityOverridePin("");
    setIdentityOverrideReason("");
    setError("");
    setPhase("list");
  };

  const speakerOptions = useMemo(() => {
    if (!activeSession) return [];
    if (activeSession.student) {
      return [
        {
          id: activeSession.student.student_id,
          label: activeSession.student.full_name,
        },
      ];
    }
    return [
      { id: "group", label: "Answering as the group" },
      ...(activeSession.group?.members.map((member) => ({
        id: member.student_id,
        label: `${member.full_name} (${member.registration_number})`,
      })) || []),
    ];
  }, [activeSession]);

  const isWithinSlot = (session: PhysicalSession) => {
    const start = new Date(session.scheduled_start).getTime();
    const end = new Date(session.scheduled_end).getTime();
    return now >= start && now <= end;
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center text-slate-300">
          <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-emerald-400" />
          <p className="text-sm">Securing the physical evaluation panel...</p>
        </div>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <LockKeyhole className="mx-auto mb-4 h-12 w-12 text-slate-500" />
          <h1 className="text-xl font-semibold text-white">
            Physical panel is locked
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            An assigned examiner must sign in, open the project&apos;s Sessions
            tab, and unlock this panel.
          </p>
          <Button
            className="mt-6"
            onClick={() => window.location.replace("/login")}
          >
            Examiner Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-5 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">
                {panel?.project_name ||
                  activeSession?.project_name ||
                  "Physical Evaluation"}
              </p>
              <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                <MapPin className="h-3 w-3" />{" "}
                {panel?.location || activeSession?.location}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isFullscreen && (
              <Button
                variant="outline"
                onClick={enterFullscreen}
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <Expand className="h-4 w-4" />{" "}
                <span className="hidden sm:inline">Full Screen</span>
              </Button>
            )}
            {!evaluationActive && (
              <Button
                variant="outline"
                onClick={() => {
                  setError("");
                  setClosePin("");
                  setShowClosePanel(true);
                }}
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <LockKeyhole className="h-4 w-4" />{" "}
                <span className="hidden sm:inline">Close Panel</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {error && phase !== "finish_error" && (
        <div className="mx-auto mt-5 max-w-7xl px-5 md:px-8">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        </div>
      )}

      {phase === "list" && (
        <section className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Restricted student kiosk
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">
                Select your scheduled session
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <CalendarClock className="h-4 w-4" />{" "}
                {panel ? formatDate(panel.date) : "Today"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                setError("");
                try {
                  await loadSessions();
                  const activeRun =
                    await physicalEvaluationService.getActiveRun();
                  if (activeRun) await resumeActiveRun(activeRun);
                } catch (refreshError) {
                  setError(
                    refreshError instanceof Error
                      ? refreshError.message
                      : "Refresh failed",
                  );
                }
              }}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          {sessions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-14 text-center">
              <CalendarClock className="mx-auto mb-4 h-12 w-12 text-slate-600" />
              <h2 className="font-medium text-slate-200">
                No sessions are scheduled for today
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ask the examiner if you believe your session should appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sessions.map((session) => {
                const withinSlot = isWithinSlot(session);
                const canStart =
                  session.status === "scheduled" &&
                  session.submission_ready &&
                  withinSlot;
                const slotEnded =
                  now > new Date(session.scheduled_end).getTime();
                return (
                  <article
                    key={session.session_id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                        {session.group ? (
                          <UsersRound className="h-5 w-5" />
                        ) : (
                          <UserRound className="h-5 w-5" />
                        )}
                      </div>
                      <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-medium capitalize text-slate-400">
                        {session.group ? "Group" : "Individual"}
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-white">
                      {sessionTitle(session)}
                    </h2>
                    <p className="mt-1 min-h-5 text-xs text-slate-400">
                      {registrationLabel(session)}
                    </p>
                    <div className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300">
                      <p className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-emerald-400" />{" "}
                        {formatTime(session.scheduled_start)} –{" "}
                        {formatTime(session.scheduled_end)}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-400" />{" "}
                        {session.location}
                      </p>
                      <p className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-emerald-400" />{" "}
                        {session.demo_enabled ? "Demo and AI viva" : "AI viva"}
                      </p>
                    </div>
                    <Button
                      onClick={() => setSelectedSession(session)}
                      disabled={!canStart}
                      className="mt-5 w-full bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      {session.status === "in_progress"
                        ? "Evaluation in progress"
                        : !session.submission_ready
                          ? "Submission is still processing"
                          : slotEnded
                            ? "Scheduled time has ended"
                            : !withinSlot
                              ? `Available at ${formatTime(session.scheduled_start)}`
                              : "Select This Session"}
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {phase === "preparing" && (
        <EvaluationShell
          session={activeSession}
          videoRef={attachPreview}
          cameraActive
        >
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">
              {activeSession?.group && faceBindingStatus === "scanning"
                ? "Identifying participants"
                : "Preparing your evaluation"}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              {activeSession?.group && faceBindingStatus === "scanning"
                ? "Keep every group member visible and facing the room camera. The first question will appear when this identity check finishes."
                : "Keep every group member visible while the room camera becomes ready."}
            </p>
            {activeSession?.group && (
              <p className="mt-4 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-200">
                {faceBindingStatus === "scanning"
                  ? "Secure face verification in progress…"
                  : "Starting secure face verification…"}
              </p>
            )}
          </div>
        </EvaluationShell>
      )}

      {phase === "identity_review" && (
        <EvaluationShell
          session={activeSession}
          videoRef={attachPreview}
          cameraActive
          bindings={identityReview?.bindings || []}
          studentNames={studentNames}
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Required identity review
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Confirm the group members who are present
                </h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                identityReview?.complete
                  ? "bg-emerald-500/15 text-emerald-300"
                  : identityReview?.partial
                    ? "bg-blue-500/15 text-blue-300"
                  : identityOverrideAccepted
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-red-500/15 text-red-300"
              }`}>
                {identityReview?.complete
                  ? "All verified"
                  : identityReview?.partial
                    ? "Present members verified"
                  : identityOverrideAccepted
                    ? "Examiner override recorded"
                    : "Blocked"}
              </span>
            </div>

            <div className="mt-5 space-y-2">
              {(identityReview?.roster || activeSession?.group?.members.map((member) => ({
                ...member,
                status: "not_detected" as const,
                confidence: null,
                identity_margin: null,
                votes: 0,
              })) || []).map((member) => {
                const verified = member.status === "verified";
                const unusable = member.status === "no_usable_enrollment";
                return (
                  <div key={member.student_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {verified ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                      ) : unusable ? (
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-amber-400" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{member.full_name}</p>
                        <p className="text-xs text-slate-500">{member.registration_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${
                        verified ? "text-emerald-300" : "text-amber-300"
                      }`}>
                        {verified ? "Verified present" : unusable ? "No usable enrollment" : "Absent / not detected"}
                      </p>
                      {verified && typeof member.confidence === "number" && (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {Math.round(member.confidence * 100)}% · {member.votes} frame votes
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {(identityReview?.unknown_faces.length || 0) > 0 && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {identityReview?.unknown_faces.length} unknown/extra face{identityReview?.unknown_faces.length === 1 ? "" : "s"} detected. Red boxes are shown over the camera preview.
              </p>
            )}
            {identityReview?.partial && (
              <p className="mt-4 rounded-xl border border-blue-400/25 bg-blue-400/10 p-3 text-sm text-blue-200">
                Continue with the verified students shown above. Absent members are recorded and will not receive automatic speaker credit.
              </p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              {identityReview
                ? `${identityReview.frames_processed}/${identityReview.required_frames} verification frames · engine ${identityReview.engine_version}`
                : "No complete verification result is available."}
            </p>
            {faceBindingError && (
              <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                {faceBindingError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={faceBindingStatus === "scanning" || !activeSession}
                onClick={() => activeSession && void bindSeats(activeSession.session_id)}
                className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                {faceBindingStatus === "scanning" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Retry five-frame scan
              </Button>
              <Button
                onClick={continueAfterIdentityReview}
                disabled={!(identityReview?.can_continue ?? identityReview?.complete) && !identityOverrideAccepted}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Continue to heart-rate setup
              </Button>
            </div>

            {!(identityReview?.can_continue ?? identityReview?.complete) && !identityOverrideAccepted && (
              <div className="mt-6 border-t border-slate-800 pt-5">
                <p className="text-sm font-semibold text-amber-300">Examiner PIN override</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Use only after visually checking the students. The reason, examiner, and time are recorded.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input
                    type="password"
                    value={identityOverridePin}
                    onChange={(event) => setIdentityOverridePin(event.target.value)}
                    placeholder="Examiner PIN"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                  />
                  <input
                    value={identityOverrideReason}
                    onChange={(event) => setIdentityOverrideReason(event.target.value)}
                    placeholder="Reason for override"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => void submitIdentityOverride()}
                  disabled={busy || !identityOverridePin || identityOverrideReason.trim().length < 5}
                  className="mt-3 border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100"
                >
                  Authorize override
                </Button>
              </div>
            )}
          </div>
        </EvaluationShell>
      )}

      {phase === "sensor_setup" && (
        <EvaluationShell session={activeSession} videoRef={attachPreview} cameraActive>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-300">
              Separate optional step
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Choose the heart-rate sensor wearer</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Identity verification confirms who is in the room. This step separately records who is physically wearing the sensor; it does not change or re-run face identification.
            </p>
            {activeSession && <PhysioBandPanel sessionId={activeSession.session_id} />}
            <Button
              onClick={() => void continueAfterSensorSetup()}
              disabled={busy}
              className="mt-5 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {nextEvaluationPhase === "demo" ? "Continue to demonstration" : "Continue to AI viva"}
            </Button>
          </div>
        </EvaluationShell>
      )}

      {phase === "demo" && (
        <EvaluationShell
          session={activeSession}
          videoRef={attachPreview}
          cameraActive
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-2 text-amber-300">
              <Video className="h-5 w-5" />
              <span className="font-semibold">
                Demonstration / Presentation
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              Present your project to the camera
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              The room camera and protected session recording stay active for
              post-session behavior analysis. Continue to the AI viva when ready.
            </p>
            {error && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </p>
            )}
            <Button
              onClick={finishDemo}
              disabled={busy}
              className="mt-6 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Starting viva...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> End Demo & Begin AI Viva
                </>
              )}
            </Button>

          </div>
        </EvaluationShell>
      )}

      {phase === "viva" && (
        <EvaluationShell
          session={activeSession}
          videoRef={attachPreview}
          cameraActive
        >
          <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  AI Viva · Question {question?.question_number}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {question?.criterion} · {question?.difficulty}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={replayQuestion}
                disabled={!question || busy || isQuestionSpeaking}
                className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                {isQuestionSpeaking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Reading…
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" /> Read Question
                  </>
                )}
              </Button>
            </div>

            <h2 className="text-xl font-medium leading-8 text-white md:text-2xl">
              {question?.question_text}
            </h2>

            {isQuestionSpeaking && (
              <p className="text-sm text-indigo-300">
                The AI examiner is reading the question. Answer controls will
                unlock when playback finishes.
              </p>
            )}

            {feedbackMessage && (
              <p className="rounded-xl border border-indigo-400/20 bg-indigo-400/10 p-3 text-sm text-indigo-200">
                {feedbackMessage}
              </p>
            )}
            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </p>
            )}

            {speakerOptions.length > 1 && (
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-300">Automatic speaker detection</span>
                  <span className={`text-xs font-semibold ${
                    faceBindingStatus === "failed" && recognizedStudentNames.length === 0 ? "text-amber-400" :
                    isQuestionSpeaking ? "text-indigo-300" :
                    liveSpeaker.status === "speaking" ? "text-emerald-400" :
                    ["uncertain", "audio_blocked", "no_faces", "tracking_lost", "unavailable"].includes(liveSpeaker.status) ? "text-amber-400" :
                    "text-slate-400"
                  }`}>
                    {faceBindingStatus === "failed" && recognizedStudentNames.length === 0
                      ? "Identification failed"
                      : isQuestionSpeaking
                        ? "Paused while AI examiner speaks"
                      : liveSpeaker.status === "speaking" && liveSpeaker.studentName
                      ? `${liveSpeaker.studentName} is speaking`
                      : liveSpeaker.status === "uncertain"
                        ? "Speaker uncertain"
                        : liveSpeaker.status === "audio_blocked"
                          ? "Microphone analysis needs activation"
                          : liveSpeaker.status === "no_faces"
                            ? "No participant faces visible"
                            : liveSpeaker.status === "tracking_lost"
                              ? "Face tracking lost — keep seats visible"
                         : faceBindingStatus === "scanning" || liveSpeaker.status === "loading"
                          ? "Identifying students…"
                          : liveSpeaker.status === "unavailable"
                            ? "Unavailable — examiner review required"
                            : "Listening"}
                  </span>
                </div>
                {liveSpeaker.status === "speaking" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Detection confidence: {Math.round(liveSpeaker.confidence * 100)}%
                  </p>
                )}
                {recognizedStudentNames.length > 0 && (
                  <p className="mt-1 text-xs text-emerald-400">
                    Identified: {recognizedStudentNames.join(", ")}
                  </p>
                )}
                {(identityReview?.absent_student_ids?.length || 0) > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Absent: {(identityReview?.roster || [])
                      .filter((member) => identityReview?.absent_student_ids?.includes(member.student_id))
                      .map((member) => member.full_name)
                      .join(", ")}
                  </p>
                )}
                {liveSpeaker.error && <p className="mt-1 text-xs text-amber-400">{liveSpeaker.error}</p>}
                {liveSpeaker.status === "audio_blocked" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void liveSpeaker.activateAudio()}
                    className="mt-2 h-7 border-amber-400/30 bg-transparent px-2 text-xs text-amber-200 hover:bg-amber-400/10 hover:text-amber-100"
                  >
                    <Mic className="h-3.5 w-3.5" /> Enable microphone analysis
                  </Button>
                )}
                {faceBindingError && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                    <p className="text-xs text-amber-300">{faceBindingError}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={faceBindingStatus === "scanning" || !activeSession}
                      onClick={() => activeSession && void bindSeats(activeSession.session_id)}
                      className="h-7 border-amber-400/30 bg-transparent px-2 text-xs text-amber-200 hover:bg-amber-400/10 hover:text-amber-100"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retry identification
                    </Button>
                  </div>
                )}
                {missingEnrollment.length > 0 && (
                  <p className="mt-1 text-xs text-amber-400">
                    {missingEnrollment.length}{" "}
                    {missingEnrollment.length === 1 ? "student has" : "students have"}{" "}
                    no enrolment photo and cannot be recognised automatically.
                    Their answers will be held for examiner review.
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="physical-answer"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Your answer
              </label>
              <textarea
                id="physical-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={busy || isQuestionSpeaking}
                rows={6}
                placeholder="Speak or type your answer here..."
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 disabled:opacity-60"
              />
              {isTranscribing && (
                <p className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Transcribing what was just said...
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={startListening}
                disabled={busy || isQuestionSpeaking}
                className={
                  isListening
                    ? "border-red-400/40 bg-red-500/15 text-red-200 hover:bg-red-500/20"
                    : "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 hover:text-white"
                }
              >
                {isListening ? (
                  <>
                    <Square className="h-4 w-4" /> Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" /> Speak Answer
                  </>
                )}
              </Button>
              <Button
                onClick={submitAnswer}
                disabled={
                  (!answer.trim() && !isTranscribing && !isListening) ||
                  busy ||
                  isQuestionSpeaking
                }
                className="bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />{" "}
                    {answerProgress === "taking_longer"
                      ? "Still evaluating safely..."
                      : "Evaluating answer..."}
                  </>
                ) : (
                  "Submit Answer"
                )}
              </Button>
            </div>
          </div>
        </EvaluationShell>
      )}

      {phase === "finalizing" && (
        <section className="mx-auto flex max-w-2xl items-center justify-center px-5 py-16">
          <div className="w-full rounded-3xl border border-indigo-400/20 bg-slate-900 p-8 text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-indigo-300" />
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Answer saved
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Finishing the session recording
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {sessionRecorder.finalizationStage === "stopping"
                ? "Stopping the room recording safely…"
                : sessionRecorder.finalizationStage === "uploading"
                  ? "Uploading the final recording segment…"
                  : "Verifying the complete recording for behavior analysis…"}
            </p>
            <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-100">
              Please keep this window open. This does not change the saved answer or score.
            </p>
          </div>
        </section>
      )}

      {phase === "finish_error" && (
        <section className="mx-auto flex max-w-2xl items-center justify-center px-5 py-16">
          <div className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <RefreshCw className="mx-auto mb-4 h-11 w-11 text-red-300" />
            <h2 className="text-xl font-semibold text-white">
              Could not finish the session
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-200">{error}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Your evaluated answers are already saved. Retry resumes the
              recording upload or finalization; it does not submit the answer again.
            </p>
            <Button
              onClick={retryFinish}
              disabled={busy}
              className="mt-6 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {busy ? "Finishing..." : "Retry & Continue"}
            </Button>
          </div>
        </section>
      )}

      {phase === "complete" && (
        <section className="mx-auto flex max-w-2xl items-center justify-center px-5 py-16">
          <div className="w-full rounded-3xl border border-emerald-500/20 bg-slate-900 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-400" />
            <h2 className="text-2xl font-semibold text-white">
              Evaluation completed
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The answers were scored by the shared viva evaluator. The camera
              session has ended, and the next student can begin immediately.
              The protected recording will continue uploading in the background.
            </p>
            <p className="mt-5 font-medium text-slate-200">
              Thank you,{" "}
              {activeSession ? sessionTitle(activeSession) : "student"}.
            </p>
            <Button
              onClick={returnToSessions}
              className="mt-7 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              Continue to Next Student
            </Button>
          </div>
        </section>
      )}

      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                  Confirm your identity
                </p>
                <h2 className="mt-0.5 text-xl font-semibold text-white">
                  {sessionTitle(selectedSession)}
                </h2>
              </div>
            </div>
            <div className="mt-5 space-y-3 rounded-2xl bg-slate-950 p-4 text-sm text-slate-300">
              <p>
                <span className="text-slate-500">Registration:</span>{" "}
                {registrationLabel(selectedSession)}
              </p>
              <p>
                <span className="text-slate-500">Time:</span>{" "}
                {formatTime(selectedSession.scheduled_start)} –{" "}
                {formatTime(selectedSession.scheduled_end)}
              </p>
              <p>
                <span className="text-slate-500">Evaluation:</span>{" "}
                {selectedSession.demo_enabled
                  ? "Demonstration and AI viva"
                  : "AI viva"}
              </p>
            </div>
            <div className="mt-5 flex gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-200">
              <MicOff className="mt-0.5 h-4 w-4 shrink-0" /> Camera permission
              is required and remains active until the viva is complete. No
              video is recorded or uploaded; microphone access is requested
              only when using Speak Answer.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedSession(null)}
                disabled={busy}
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                Not My Session
              </Button>
              <Button
                onClick={startSelectedSession}
                disabled={busy}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                {busy ? "Starting..." : "Start Evaluation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showClosePanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
            <LockKeyhole className="mb-4 h-9 w-9 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">
              Close physical panel
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Only the examiner can close this restricted window. The panel
              password is required.
            </p>
            <input
              type="password"
              autoFocus
              value={closePin}
              onChange={(event) => {
                setClosePin(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") closePanel();
              }}
              placeholder="Panel password"
              className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-emerald-400"
            />
            {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowClosePanel(false);
                  setError("");
                }}
                disabled={busy}
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={closePanel}
                disabled={!closePin || busy}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                {busy ? "Closing..." : "Close & Lock"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function EvaluationShell({
  session,
  videoRef,
  cameraActive = false,
  bindings = [],
  studentNames = {},
  children,
}: {
  session: PhysicalSession | null;
  videoRef: (node: HTMLVideoElement | null) => void;
  cameraActive?: boolean;
  bindings?: SeatBinding[];
  studentNames?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[minmax(300px,0.8fr)_minmax(420px,1.2fr)] lg:px-8">
      <div>
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-xl">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          {bindings
            .filter((binding) => binding.bbox?.length === 4)
            .map((binding, index) => {
              const bbox = binding.bbox as number[];
              const known = Boolean(binding.student_id);
              return (
                <div
                  key={`${binding.student_id || "unknown"}-${index}`}
                  className={`pointer-events-none absolute border-2 ${known ? "border-emerald-400" : "border-red-400"}`}
                  style={{
                    left: `${Math.max(0, bbox[0]) * 100}%`,
                    top: `${Math.max(0, bbox[1]) * 100}%`,
                    width: `${Math.max(0, bbox[2] - bbox[0]) * 100}%`,
                    height: `${Math.max(0, bbox[3] - bbox[1]) * 100}%`,
                  }}
                >
                  <span className={`absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${known ? "bg-emerald-600" : "bg-red-600"}`}>
                    {binding.student_id
                      ? studentNames[binding.student_id] || "Verified member"
                      : "Unknown / extra face"}
                  </span>
                </div>
              );
            })}
          <div className="absolute bottom-3 left-3 rounded-lg bg-black/65 px-2.5 py-1.5 text-xs text-white">
            Room camera
          </div>
          {cameraActive && (
            <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />{" "}
              CAMERA ON
            </div>
          )}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="font-medium text-white">
            {session ? sessionTitle(session) : "Preparing participant"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {session ? registrationLabel(session) : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />{" "}
              {session
                ? `${formatTime(session.scheduled_start)} – ${formatTime(session.scheduled_end)}`
                : ""}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> {session?.location}
            </span>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}
