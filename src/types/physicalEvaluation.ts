import type {
  CurrentQuestionResponse,
  StartVivaResponse,
  VivaQuestion,
} from "@/types/vivaSession";

export type PhysicalStudent = {
  student_id: string;
  full_name: string;
  registration_number: string;
};

export type PhysicalGroup = {
  group_id: string;
  group_name: string;
  members: PhysicalStudent[];
};

export type PhysicalSession = {
  session_id: string;
  project_name: string;
  student: PhysicalStudent | null;
  group: PhysicalGroup | null;
  scheduled_start: string;
  scheduled_end: string;
  location: string;
  demo_enabled: boolean;
  status: "scheduled" | "in_progress" | "completed";
  physical_status:
    | "demo_in_progress"
    | "viva_in_progress"
    | "recording_uploading"
    | "recording_failed"
    | "completed"
    | null;
  submission_ready: boolean;
};

export type KioskOpenResponse = {
  kiosk_token: string;
  token_header: string;
  expires_at: string;
  project_id: string;
  project_name: string;
  location: string;
  examiner_session_cleared: boolean;
};

export type PhysicalSessionList = {
  date: string;
  project_id: string;
  project_name: string;
  location: string;
  sessions: PhysicalSession[];
};

export type PhysicalRun = {
  id: string;
  session: PhysicalSession;
  status:
    | "demo_in_progress"
    | "viva_in_progress"
    | "recording_uploading"
    | "recording_failed"
    | "completed";
  recording_started_at: string;
  viva_started_at: string | null;
  completed_at: string | null;
  next_action?: "start_demo" | "start_viva";
  recording_upload?: PhysicalRecordingUpload | null;
};

export type PhysicalRecordingUpload = {
  id: string;
  session_id: string;
  status: "capturing" | "uploading" | "finalizing" | "ready" | "failed";
  mime_type: string;
  expected_chunks: number | null;
  uploaded_chunks: number;
  uploaded_chunk_indices: number[];
  duration_seconds: number | null;
  error_message: string;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  upload_token?: string;
};

export type PhysicalCompletion = {
  run: PhysicalRun;
  recording_id: string;
  video_file_url: string;
  audio_file_url: string | null;
  duration_seconds: number;
};

export type PhysicalSubmitVivaAnswerResponse = {
  answer_saved: boolean;
  session_complete: boolean;
  message?: string;
  next_question?: VivaQuestion;
  clarification?: boolean;
};

export type { CurrentQuestionResponse, StartVivaResponse };
