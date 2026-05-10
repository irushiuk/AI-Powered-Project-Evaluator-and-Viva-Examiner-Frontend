"use client"

import { useState , useEffect} from "react"
import CreateVivaModal from "@/components/dashboard/CreateVivaModal"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { Viva } from "@/types/viva"
import { vivaService } from "@/services/vivaService"
import { Button } from "@/components/ui/button"

type CardProps = {
  title: string
  value: string | number
}

type GlassCardProps = {
  children: React.ReactNode
}

export default function TeacherDashboard() {

  const [open, setOpen] = useState(false)
  const [activePage, setActivePage] = useState("dashboard")
  const [vivas, setVivas] = useState<Viva[]>([])

  const handleCreateViva = async (data: Omit<Viva, "id">) => {
    await vivaService.createViva(data)
    const updated = await vivaService.getVivas()  
    setVivas(updated)
  }

  useEffect(() => {
    vivaService.getVivas().then(setVivas)
  }, [])

  return (
    <DashboardLayout
      activePage={activePage}
      setActivePage={setActivePage}
    >

      <CreateVivaModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreate={handleCreateViva}
      />

      {activePage === "dashboard" && (
        <>
          <h1 className="mb-6 text-3xl font-bold">
            Teacher Dashboard
          </h1>

          <div className="mb-8 grid grid-cols-3 gap-6">
            <Card title="Total Students" value="120" />
            <Card title="Active Vivas" value={vivas.length} />
            <Card title="Evaluated" value="56" />
          </div>

          <div className="grid grid-cols-2 gap-6">

            <GlassCard>
              <h2 className="mb-2 text-xl font-semibold">
                Create New Viva
              </h2>

              <p className="mb-4 opacity-70">
                Upload questions and configure AI evaluation
              </p>

              <Button
                onClick={() => setOpen(true)}
              >
                Create
              </Button>
            </GlassCard>

            <GlassCard>
              <h2 className="mb-2 text-xl font-semibold">
                Review Submissions
              </h2>

              <p className="mb-4 opacity-70">
                Check AI feedback & grade students
              </p>

              <Button>
                Review
              </Button>
            </GlassCard>

          </div>
        </>
      )}

      {activePage === "vivas" && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              Created Vivas
            </h1>

            <Button
              onClick={() => setOpen(true)}
            >
              + Create Viva
            </Button>
          </div>

          {vivas.length === 0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">
              No vivas created yet
            </div>
          ) : (
            <div className="grid gap-4">
              {vivas.map((viva) => (
                <VivaTeacherCard key={viva.id} viva={viva} />
              ))}
            </div>
          )}
        </>
      )}

    </DashboardLayout>
  )
}

function VivaTeacherCard({ viva }: { viva: Viva }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{viva.module}</h2>
          <p className="mt-1 text-sm text-gray-500">Duration: {viva.duration} mins</p>
          <p className="text-sm text-gray-500">Deadline: {viva.enrollmentDeadline}</p>
          <span className="mt-2 inline-block rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
            {viva.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-16 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-blue-700">{viva.enrolledStudents.length}</p>
            <p className="text-xs text-blue-500">enrolled</p>
          </div>

          {viva.enrolledStudents.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setExpanded((p) => !p)}
            >
              {expanded ? "Hide ▲" : "Students ▼"}
            </Button>
          )}
        </div>
      </div>

      {viva.rubrics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {viva.rubrics.map((rubric) => (
            <span
              key={rubric.id}
              className="rounded-full bg-purple-50 px-2 py-1 text-xs text-purple-700"
            >
              {rubric.title} ({rubric.maxMarks} marks)
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-5 border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Enrolled Students ({viva.enrolledStudents.length})
          </h3>

          <div className="space-y-2">
            {viva.enrolledStudents.map((student, idx) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{student.name}</p>
                    <p className="text-xs text-gray-400">{student.email}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">#{idx + 1}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(student.enrolledAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

function Card({ title, value }: CardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <p className="opacity-70">{title}</p>
      <h2 className="mt-2 text-2xl font-bold">{value}</h2>
    </div>
  )
}

function GlassCard({ children }: GlassCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  )
}