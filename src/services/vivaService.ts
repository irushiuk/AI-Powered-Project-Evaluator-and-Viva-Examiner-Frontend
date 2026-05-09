import { mockVivas } from "@/mock/mockVivas"
import { Viva , EnrolledStudent , VivaStatus} from "@/types/viva"

let vivas = [...mockVivas]

export const vivaService = {

  async getVivas(): Promise<Viva[]> {
    const today = new Date(new Date().toDateString())

    return vivas.map((viva) => {
      if (viva.status === "Scheduled" || viva.status === "Completed") {
        return viva // don't touch manually set statuses
      }

      const deadline = new Date(viva.enrollmentDeadline)
      const updatedStatus: VivaStatus =
        deadline < today ? "Enrollment Closed" : "Enrollment Open"

      return { ...viva, status: updatedStatus }
    })
  },

  async createViva(
    data: Omit<Viva, "id">
  ): Promise<Viva> {

    const newViva: Viva = {
      id: crypto.randomUUID(),
      ...data,
      enrolledStudents: [],
    }

    vivas.push(newViva)

    return newViva
  },

  async enrollStudent(
    vivaId: string,
    student: Omit<EnrolledStudent, "id" | "enrolledAt">
  ): Promise<Viva> {
    const viva = vivas.find((v) => v.id === vivaId)
    if (!viva) throw new Error("Viva not found")

    const alreadyEnrolled = viva.enrolledStudents.some(
      (s) => s.email === student.email
    )
    if (alreadyEnrolled) throw new Error("Already enrolled")

    viva.enrolledStudents.push({
      ...student,
      id: crypto.randomUUID(),
      enrolledAt: new Date().toISOString(),
    })

    return viva
  },
}