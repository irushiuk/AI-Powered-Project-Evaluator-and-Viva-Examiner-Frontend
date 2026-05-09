import { mockEnrollments } from "@/mock/mockEnrollments"
import { VivaEnrollment } from "@/types/enrollment"

let enrollments = [...mockEnrollments]

export const enrollmentService = {

  async enrollStudent(
    vivaId: string,
    studentId: string
  ) {

    const newEnrollment: VivaEnrollment = {
      id: crypto.randomUUID(),

      vivaId,

      studentId,

      enrolledAt: new Date().toISOString(),

      status: "Enrolled",
    }

    enrollments.push(newEnrollment)

    return newEnrollment
  },

  async getStudentEnrollments(
    studentId: string
  ) {

    return enrollments.filter(
      (e) => e.studentId === studentId
    )
  },
}