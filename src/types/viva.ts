import { Rubric } from "./rubric"

export type VivaStatus =
  | "Enrollment Open"
  | "Enrollment Closed"
  | "Scheduled"
  | "Completed"


export type EnrolledStudent = {
  id: string
  name: string
  email: string
  enrolledAt: string
}


export type Viva = {
  id: string

  module: string

  description?: string

  duration: number

  enrollmentDeadline: string

  scheduledDate?: string

  scheduledStartTime?: string

  status: VivaStatus

  rubrics: Rubric[]

  enrolledStudents: EnrolledStudent[]
}