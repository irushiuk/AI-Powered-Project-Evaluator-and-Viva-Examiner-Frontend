"use client"

import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { Button } from "@/components/ui/button"
import { vivaService } from "@/services/vivaService"
import { Viva } from "@/types/viva"
import { useEffect, useState } from "react"

// Mock current student — replace with your auth context/session
const CURRENT_STUDENT = {
  name: "Alex Johnson",
  email: "alex.johnson@student.edu",
}

type VivaCardProps = {
  viva: Viva
  isEnrolled: boolean
  isLoading: boolean
  onEnroll: () => void
}

type StatProps = {
  title: string
  value: string
}

export default function StudentDashboard() {
  const [vivas, setVivas] = useState<Viva[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const refresh = async () => {
    const data = await vivaService.getVivas()
    setVivas(data)
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleEnroll = async (vivaId: string) => {
    setLoadingId(vivaId)
    try {
      await vivaService.enrollStudent(vivaId, CURRENT_STUDENT)
      await refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
    }
  }

  const enrolledVivas = vivas.filter((v) =>
    v.enrolledStudents.some((s) => s.email === CURRENT_STUDENT.email)
  )

  const availableVivas = vivas.filter(
    (v) => !v.enrolledStudents.some((s) => s.email === CURRENT_STUDENT.email)
  )

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Student Dashboard</h1>

      {/* Enrolled Vivas */}
      {enrolledVivas.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            My Enrolled Vivas
            <span className="ml-2 text-sm font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {enrolledVivas.length} enrolled
            </span>
          </h2>
          <div className="space-y-4">
            {enrolledVivas.map((viva) => (
              <VivaCard
                key={viva.id}
                viva={viva}
                isEnrolled={true}
                isLoading={false}
                onEnroll={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Vivas */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Vivas</h2>
        <div className="space-y-4">
          {availableVivas.length === 0 ? (
            <div className="bg-white border rounded-xl p-6 text-gray-500">
              No vivas available
            </div>
          ) : (
            availableVivas.map((viva) => (
              <VivaCard
                key={viva.id}
                viva={viva}
                isEnrolled={false}
                isLoading={loadingId === viva.id}
                onEnroll={() => handleEnroll(viva.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Performance */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Performance</h2>
        <div className="grid grid-cols-3 gap-6">
          <Stat title="Avg Score" value="82%" />
          <Stat title="Completed" value="5" />
          <Stat title="Pending" value={enrolledVivas.length.toString()} />
        </div>
      </div>
    </DashboardLayout>
  )
}

/* Components */

function VivaCard({ viva, isEnrolled, isLoading, onEnroll }: VivaCardProps) {
  const canEnroll =
    viva.status === "Enrollment Open" &&
    new Date(viva.enrollmentDeadline) >= new Date(new Date().toDateString())
  return (
    <div className={`bg-white p-5 rounded-xl border flex justify-between items-center gap-4 ${
      isEnrolled ? "border-green-200 bg-green-50/40" : "border-gray-200"
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{viva.module}</h3>
          {isEnrolled && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Enrolled
            </span>
          )}
        </div>

        <p className="opacity-60 text-sm mt-1">{viva.status}</p>
        <p className="text-sm text-gray-500 mt-1">Duration: {viva.duration} mins</p>
        <p className="text-sm text-gray-500">
          Enrollment Deadline: {viva.enrollmentDeadline}
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          {viva.rubrics.map((rubric) => (
            <div
              key={rubric.id}
              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
            >
              {rubric.title} ({rubric.maxMarks})
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-2">
          👥 {viva.enrolledStudents.length} student{viva.enrolledStudents.length !== 1 ? "s" : ""} enrolled
        </p>
      </div>

      <div className="shrink-0">
        {isEnrolled ? (
          <Button variant="outline" disabled>Enrolled ✓</Button>
        ) : (
          <Button
            onClick={onEnroll}
            disabled={isLoading || !canEnroll}
          >
            {isLoading ? "Enrolling..." : canEnroll ? "Enroll" : "Closed"}
          </Button>
        )}
      </div>
    </div>
  )
}

function Stat({ title, value }: StatProps) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
      <p className="opacity-70">{title}</p>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  )
}