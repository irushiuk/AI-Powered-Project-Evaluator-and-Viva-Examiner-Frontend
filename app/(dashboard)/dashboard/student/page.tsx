"use client"

import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { Button } from "@/components/ui/button"
import { vivaService } from "@/services/vivaService"
import { Viva } from "@/types/viva"
import { useEffect, useState } from "react"

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
      <h1 className="mb-6 text-3xl font-bold">Student Dashboard</h1>

      {enrolledVivas.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">
            My Enrolled Vivas
            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-sm font-normal text-green-700">
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

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Available Vivas</h2>
        <div className="space-y-4">
          {availableVivas.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-gray-500">
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

      <div>
        <h2 className="mb-4 text-xl font-semibold">Performance</h2>
        <div className="grid grid-cols-3 gap-6">
          <Stat title="Avg Score" value="82%" />
          <Stat title="Completed" value="5" />
          <Stat title="Pending" value={enrolledVivas.length.toString()} />
        </div>
      </div>
    </DashboardLayout>
  )
}

function VivaCard({ viva, isEnrolled, isLoading, onEnroll }: VivaCardProps) {
  const canEnroll =
    viva.status === "Enrollment Open" &&
    new Date(viva.enrollmentDeadline) >= new Date(new Date().toDateString())
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border bg-white p-5 ${
      isEnrolled ? "border-green-200 bg-green-50/40" : "border-gray-200"
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{viva.module}</h3>
          {isEnrolled && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Enrolled
            </span>
          )}
        </div>

        <p className="mt-1 text-sm opacity-60">{viva.status}</p>
        <p className="mt-1 text-sm text-gray-500">Duration: {viva.duration} mins</p>
        <p className="text-sm text-gray-500">Enrollment Deadline: {viva.enrollmentDeadline}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {viva.rubrics.map((rubric) => (
            <div key={rubric.id} className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
              {rubric.title} ({rubric.maxMarks})
            </div>
          ))}
        </div>

        <p className="mt-2 text-xs text-gray-400">
          👥 {viva.enrolledStudents.length} student{viva.enrolledStudents.length !== 1 ? "s" : ""} enrolled
        </p>
      </div>

      <div className="shrink-0">
        {isEnrolled ? (
          <Button variant="outline" disabled>Enrolled ✓</Button>
        ) : (
          <Button onClick={onEnroll} disabled={isLoading || !canEnroll}>
            {isLoading ? "Enrolling..." : canEnroll ? "Enroll" : "Closed"}
          </Button>
        )}
      </div>
    </div>
  )
}

function Stat({ title, value }: StatProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <p className="opacity-70">{title}</p>
      <h2 className="mt-2 text-2xl font-bold">{value}</h2>
    </div>
  )
}