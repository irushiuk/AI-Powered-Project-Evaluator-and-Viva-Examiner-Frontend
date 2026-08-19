import { PHYSICAL_API, VIVA_API } from "@/constants/api.constant";
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
  ): Promise<CurrentQuestionResponse> {
    const response = await kioskFetch(VIVA_API.currentQuestion(sessionId));
    return readJson(response, "Failed to load the current viva question");
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
  ): Promise<PhysicalRecordingUpload> {
    const extension = mimeType.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    formData.append("chunk", chunk, `chunk-${chunkIndex}.${extension}`);
    formData.append("mime_type", mimeType);
    formData.append("extension", extension);
    const response = await kioskFetch(
      PHYSICAL_API.recordingChunk(sessionId, chunkIndex),
      { method: "POST", body: formData },
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
  ): Promise<PhysicalRecordingUpload> {
    const response = await kioskFetch(
      PHYSICAL_API.finalizeRecording(sessionId),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_chunks: totalChunks,
          duration_seconds: durationSeconds,
          mime_type: mimeType,
          extension: mimeType.includes("mp4") ? "mp4" : "webm",
        }),
      },
    );
    return readJson(response, "Failed to finish the physical evaluation");
  },

  async getRecordingStatus(
    sessionId: string,
  ): Promise<PhysicalRecordingUpload> {
    const response = await kioskFetch(PHYSICAL_API.recordingStatus(sessionId));
    return readJson(response, "Failed to load recording upload status");
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
