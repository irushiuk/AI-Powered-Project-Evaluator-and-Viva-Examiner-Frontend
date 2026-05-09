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

  // create viva
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

      {/* Modal */}
      <CreateVivaModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreate={handleCreateViva}
      />

      {/* Dashboard */}
      {activePage === "dashboard" && (
        <>
          <h1 className="text-3xl font-bold mb-6">
            Teacher Dashboard
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <Card title="Total Students" value="120" />
            <Card title="Active Vivas" value={vivas.length} />
            <Card title="Evaluated" value="56" />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-6">

            <GlassCard>
              <h2 className="text-xl font-semibold mb-2">
                Create New Viva
              </h2>

              <p className="opacity-70 mb-4">
                Upload questions and configure AI evaluation
              </p>

              <Button
                onClick={() => setOpen(true)}
              >
                Create
              </Button>
            </GlassCard>

            <GlassCard>
              <h2 className="text-xl font-semibold mb-2">
                Review Submissions
              </h2>

              <p className="opacity-70 mb-4">
                Check AI feedback & grade students
              </p>

              <Button>
                Review
              </Button>
            </GlassCard>

          </div>
        </>
      )}

      {/* VIVAS PAGE */}
      {activePage === "vivas" && (
        <>
          <div className="flex items-center justify-between mb-6">
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
            <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">
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

/* Components */


function VivaTeacherCard({ viva }: { viva: Viva }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{viva.module}</h2>
          <p className="text-gray-500 text-sm mt-1">Duration: {viva.duration} mins</p>
          <p className="text-gray-500 text-sm">Deadline: {viva.enrollmentDeadline}</p>
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            {viva.status}
          </span>
        </div>

        {/* Enrollment count */}
        <div className="flex items-center gap-3">
          <div className="text-center bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 min-w-[64px]">
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

      {/* Rubrics */}
      {viva.rubrics.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {viva.rubrics.map((rubric) => (
            <span
              key={rubric.id}
              className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full"
            >
              {rubric.title} ({rubric.maxMarks} marks)
            </span>
          ))}
        </div>
      )}

      {/* Enrolled students list */}
      {expanded && (
        <div className="mt-5 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Enrolled Students ({viva.enrolledStudents.length})
          </h3>

          <div className="space-y-2">
            {viva.enrolledStudents.map((student, idx) => (
              <div
                key={student.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">
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
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
      <p className="opacity-70">{title}</p>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  )
}

function GlassCard({ children }: GlassCardProps) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
      {children}
    </div>
  )
}