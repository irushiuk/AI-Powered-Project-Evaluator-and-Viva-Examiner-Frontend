export type EnrollmentStatus =
  | "Enrolled"
  | "Scheduled"
  | "Completed"

export type VivaEnrollment = {
  id: string

  vivaId: string

  studentId: string

  enrolledAt: string

  slotStart?: string

  slotEnd?: string

  status: EnrollmentStatus
}