import { ATTRIBUTION_API, PHYSICAL_API, VIVA_API } from "@/constants/api.constant";
import type {
  CurrentQuestionResponse,
  KioskOpenResponse,
  PhysicalCompletion,
  PhysicalRecordingUpload,
  PhysicalRun,
  PhysicalSessionList,
  PhysicalSubmitVivaAnswerResponse,
  StartVivaResponse,
} from "@/types/physicalEvaluation";
import apiFetch from "./apiClient";

const KIOSK_TOKEN_KEY = "vivasense.physical-kiosk-token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(KIOSK_TOKEN_KEY);
}

function saveToken(token: string) {
  window.sessionStorage.setItem(KIOSK_TOKEN_KEY, token);
}

function clearToken() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(KIOSK_TOKEN_KEY);
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const payload = data as Record<string, unknown>;
  if (typeof payload.error === "string") return payload.error;
  if (typeof payload.message === "string") return payload.message;
  if (typeof payload.detail === "string") return payload.detail;

  if (payload.errors && typeof payload.errors === "object") {
    const first = Object.values(payload.errors as Record<string, unknown>)[0];
    if (typeof first === "string") return first;
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }
  return fallback;
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(payload, fallback));
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

async function kioskFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getToken();
  if (!token)
    throw new Error(
      "The physical panel is locked. Ask the examiner to open it again.",
    );

  const headers = new Headers(init.headers);
  headers.set("X-Physical-Kiosk-Token", token);
  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "omit",
  });

  if (response.status === 401) clearToken();
  return response;
}

async function recordingFetch(
  input: RequestInfo | URL,
  init: RequestInit,
  recordingToken?: string,
) {
  if (!recordingToken) return kioskFetch(input, init);
  const headers = new Headers(init.headers);
  headers.set("X-Physical-Recording-Token", recordingToken);
  return fetch(input, {
    ...init,
    headers,
    credentials: "omit",
  });
}

export const physicalEvaluationService = {
  hasKioskToken(): boolean {
    return Boolean(getToken());
  },

  forgetKioskToken() {
    clearToken();
  },

  async openKiosk(projectId: string, pin: string): Promise<KioskOpenResponse> {
    const response = await apiFetch(PHYSICAL_API.openKiosk(projectId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await readJson<KioskOpenResponse>(
      response,
      "Failed to open the physical panel",
    );
    saveToken(data.kiosk_token);
    return data;
  },

  async listSessions(): Promise<PhysicalSessionList> {
    const response = await kioskFetch(PHYSICAL_API.sessions);
    return readJson(response, "Failed to load today's physical sessions");
  },

  async getActiveRun(): Promise<PhysicalRun | null> {
    const response = await kioskFetch(PHYSICAL_API.activeRun);
    return readJson(response, "Failed to check the active physical evaluation");
  },

  async startSession(sessionId: string): Promise<PhysicalRun> {
    const response = await kioskFetch(PHYSICAL_API.startSession(sessionId), {
      method: "POST",
    });
    return readJson(response, "Failed to start the physical evaluation");
  },

  async completeDemo(sessionId: string): Promise<void> {
    const response = await kioskFetch(PHYSICAL_API.completeDemo(sessionId), {
      method: "POST",
    });
    await readJson<unknown>(response, "Failed to complete the demonstration");
  },

  async finishSession(sessionId: string): Promise<PhysicalRun> {
    const response = await kioskFetch(PHYSICAL_API.finishSession(sessionId), {
      method: "POST",
    });
    return readJson(response, "Failed to finish the physical evaluation");
  },

  async startViva(sessionId: string): Promise<StartVivaResponse> {
    const response = await kioskFetch(VIVA_API.startSession, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    return readJson(response, "Failed to start the AI viva");
  },

  async submitAnswer(
    sessionId: string,
    questionId: string,
    answerText: string,
    speakerId: string,
  ): Promise<PhysicalSubmitVivaAnswerResponse> {
    const response = await kioskFetch(VIVA_API.submitAnswer(sessionId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: questionId,
        answer_text: answerText,
        speaker_id: speakerId,
      }),
    });
    return readJson(response, "Failed to submit the answer");
  },

  async getCurrentQuestion(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<CurrentQuestionResponse> {
    const response = await kioskFetch(VIVA_API.currentQuestion(sessionId), { signal });
    return readJson(response, "Failed to load the current viva question");
  },

  /** Stream or poll the generated examiner voice using the kiosk credential. */
  async getQuestionAudio(
    sessionId: string,
    questionId: string,
    signal?: AbortSignal,
  ): Promise<Response> {
    return kioskFetch(VIVA_API.questionAudio(sessionId, questionId), { signal });
  },

  async completeSession(
    sessionId: string,
    recording: Blob,
  ): Promise<PhysicalCompletion> {
    const extension = recording.type.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    formData.append(
      "video_file",
      recording,
      `physical-evaluation-${sessionId}.${extension}`,
    );
    const response = await kioskFetch(PHYSICAL_API.completeSession(sessionId), {
      method: "POST",
      body: formData,
    });
    return readJson(
      response,
      "Failed to upload the physical evaluation recording",
    );
  },

  async uploadRecordingChunk(
    sessionId: string,
    chunkIndex: number,
    chunk: Blob,
    mimeType: string,
    signal?: AbortSignal,
    recordingToken?: string,
  ): Promise<PhysicalRecordingUpload> {
    const extension = mimeType.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    formData.append("chunk", chunk, `chunk-${chunkIndex}.${extension}`);
    formData.append("mime_type", mimeType);
    formData.append("extension", extension);
    const response = await recordingFetch(
      PHYSICAL_API.recordingChunk(sessionId, chunkIndex),
      { method: "POST", body: formData, signal },
      recordingToken,
    );
    return readJson(
      response,
      `Failed to upload recording chunk ${chunkIndex + 1}`,
    );
  },

  async finalizeChunkedRecording(
    sessionId: string,
    totalChunks: number,
    durationSeconds: number,
    mimeType: string,
    signal?: AbortSignal,
    deferCommit = false,
    recordingToken?: string,
  ): Promise<PhysicalRecordingUpload> {
    const response = await recordingFetch(
      PHYSICAL_API.finalizeRecording(sessionId),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_chunks: totalChunks,
          duration_seconds: durationSeconds,
          mime_type: mimeType,
          extension: mimeType.includes("mp4") ? "mp4" : "webm",
          defer_commit: deferCommit,
        }),
        signal,
      },
      recordingToken,
    );
    return readJson(response, "Failed to finish the physical evaluation");
  },

  async getRecordingStatus(
    sessionId: string,
    signal?: AbortSignal,
    recordingToken?: string,
  ): Promise<PhysicalRecordingUpload> {
    const response = await recordingFetch(
      PHYSICAL_API.recordingStatus(sessionId),
      { signal },
      recordingToken,
    );
    return readJson(response, "Failed to load recording upload status");
  },

  /**
   * Bind each face in the room to a roster student.
   *
   * A physical group viva has one camera and everyone in frame at once, so
   * before lip activity can name a speaker, each face has to be tied to a
   * student. A short camera burst is matched against enrolment photos
   * server-side, so a blink or momentary head turn cannot ruin the binding.
   *
   * Returns which students were recognised and which have no enrolment photo
   * (those can never be credited automatically). Binding failures are
   * surfaced so the kiosk can retry instead of waiting indefinitely.
   */
  async bindSeats(
    sessionId: string,
    frames: Blob[],
  ): Promise<{
    bindings: {
      student_id: string | null;
      confidence: number;
      bbox?: number[] | null;
      identity_confidence?: number | null;
      votes?: number;
      frames_processed?: number;
    }[];
    unmatched: number;
    missing_enrollment: string[];
    frames_processed: number;
  }> {
    const formData = new FormData();
    frames.forEach((frame, index) => {
      formData.append("frames", frame, `bind-${index + 1}.jpg`);
    });
    const response = await kioskFetch(ATTRIBUTION_API.bind(sessionId), {
      method: "POST",
      body: formData,
    });
    return readJson(response, "Failed to identify the students in the room");
  },

  /**
   * Report who was speaking. Coalesced spans, not per-frame samples.
   * Silent on failure: a dropped batch costs attribution, not the exam.
   */
  async sendSpeakerEvidence(
    sessionId: string,
    events: unknown[],
  ): Promise<number> {
    if (!events.length) return 0;
    try {
      const response = await kioskFetch(ATTRIBUTION_API.evidence(sessionId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "live_cv", events }),
      });
      if (!response.ok) return 0;
      const payload = await response.json().catch(() => null);
      return payload?.data?.stored ?? 0;
    } catch {
      return 0;
    }
  },

  async closeKiosk(pin: string): Promise<void> {
    const response = await kioskFetch(PHYSICAL_API.closeKiosk, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    await readJson<unknown>(response, "Failed to close the physical panel");
    clearToken();
  },
};
