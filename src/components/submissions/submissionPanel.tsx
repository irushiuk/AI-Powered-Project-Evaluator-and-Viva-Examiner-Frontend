"use client"

import { useState } from "react"
import DashboardLayout from "../dashboard/DashboardLayout"

type Submission = {
  id: string
  indexNo: string
  name: string
  pdfUrl: string
  projectUrl: string
}

type Project = {
  id: string
  title: string
  description?: string
  submissions: Submission[]
}

// Mock data (replace with API later)
const mockProjects: Project[] = [
  {
    id: "p1",
    title: "AI Project Evaluator",
    description: "Automated viva and project grading system",
    submissions: [
      {
        id: "s1",
        indexNo: "IT2021001",
        name: "Nimal Perera",
        pdfUrl: "/mock/report1.pdf",
        projectUrl: "https://github.com/example/project1",
      },
      {
        id: "s2",
        indexNo: "IT2021002",
        name: "Kavindi Silva",
        pdfUrl: "/mock/report2.pdf",
        projectUrl: "https://github.com/example/project2",
      },
    ],
  },
  {
    id: "p2",
    title: "Smart Attendance System",
    description: "Face recognition based attendance tracking",
    submissions: [
      {
        id: "s3",
        indexNo: "IT2021003",
        name: "Amila Fernando",
        pdfUrl: "/mock/report3.pdf",
        projectUrl: "https://github.com/example/project3",
      },
    ],
  },
]

export default function SubmissionsPanel() {
  const [selectedProject, setSelectedProject] = useState<Project>(
    mockProjects[0]
  )

  return (
    <DashboardLayout>
    <div className="flex flex-col lg:flex-row gap-6">

      {/* LEFT: Projects */}
      <aside className="w-full lg:w-1/3 bg-white border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Projects</h2>

        <div className="space-y-2">
          {mockProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                selectedProject.id === project.id
                  ? "bg-blue-100 border-blue-400"
                  : "hover:bg-gray-50"
              }`}
            >
              <p className="font-medium">{project.title}</p>
              <p className="text-xs text-gray-500">
                {project.description}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* RIGHT: Submissions */}
      <section className="flex-1 bg-white border rounded-xl p-4">
        
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Submissions
          </h2>
          <p className="text-sm text-gray-500">
            {selectedProject.title}
          </p>
        </div>

        {selectedProject.submissions.length === 0 ? (
          <p className="text-gray-500">No submissions yet</p>
        ) : (
          <div className="space-y-4">
            {selectedProject.submissions.map((s) => (
              <div
                key={s.id}
                className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >

                {/* Student Info */}
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-gray-500">
                    {s.indexNo}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">

                  {/* View PDF */}
                  <a
                    href={s.pdfUrl}
                    target="_blank"
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    View Report
                  </a>

                  {/* Download PDF */}
                  <a
                    href={s.pdfUrl}
                    download
                    className="px-3 py-1 bg-gray-200 rounded-lg text-sm"
                  >
                    Download
                  </a>

                  {/* Project Repo */}
                  <a
                    href={s.projectUrl}
                    target="_blank"
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm"
                  >
                    Repo
                  </a>

                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    </DashboardLayout>
  )
}