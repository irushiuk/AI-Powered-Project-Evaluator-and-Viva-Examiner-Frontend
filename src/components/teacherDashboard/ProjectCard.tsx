"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Calendar,
  Users,
  User,
  UserCircle,
  ArrowRight,
  Building2,
  Laptop,
} from "lucide-react"

import { Project } from "@/types/project"
import { projectService } from "@/services/projectService"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Props = {
  project: Project
  onActivated: () => void
}

export default function ProjectCard({
  project,
  onActivated,
}: Props) {
  const [activating, setActivating] = useState(false)

  const handleActivate = async () => {
    setActivating(true)

    try {
      await projectService.activate(project.id)

      toast.success(
        `${project.project_name} is now active`
      )

      onActivated()
    } catch {
      toast.error("Failed to activate project")
    } finally {
      setActivating(false)
    }
  }

  return (
    <Card className="rounded-2xl border hover:shadow-md transition-all duration-300 h-full">

      <CardHeader className="space-y-4">
        {/* Title + badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-xl leading-snug line-clamp-2">
              {project.project_name}
            </CardTitle>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="capitalize bg-blue-50 text-blue-700 border-blue-200"
              >
                {project.status}
              </Badge>

              <Badge
                variant="outline"
                className={project.evaluation_mode === "physical"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1"
                }
              >
                {project.evaluation_mode === "physical" ? (
                  <><Building2 className="h-3 w-3" /> Physical</>
                ) : (
                  <><Laptop className="h-3 w-3" /> Remote</>
                )}
              </Badge>

              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"
              >
                {project.is_group_project ? (
                  <>
                    <Users className="h-3 w-3" /> Group
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3" /> Individual
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {project.description ||
            "No description available"}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">

        {/* Project Type */}
        <div className="flex items-center gap-3">
          {project.is_group_project ? (
            <Users className="h-5 w-5 text-muted-foreground" />
          ) : (
            <UserCircle className="h-5 w-5 text-muted-foreground" />
          )}

          <div>
            <p className="text-sm font-medium">
              Project Type
            </p>

            <p className="text-sm text-muted-foreground">
              {project.is_group_project
                ? "Group Project"
                : "Individual Project"}
            </p>
          </div>
        </div>

        {/* Deadline */}
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />

          <div>
            <p className="text-sm font-medium">
              Deadline
            </p>

            <p className="text-sm text-muted-foreground">
              {project.submission_deadline
                ? new Date(
                    project.submission_deadline
                  ).toLocaleDateString()
                : "No deadline"}
            </p>
          </div>
        </div>

        {/* Academic year */}
        <div>
          <p className="text-sm font-medium">
            Academic Year
          </p>

          <p className="text-sm text-muted-foreground">
            {project.academic_year || "N/A"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3">

          {project.status === "draft" ? (
            <Button
              onClick={handleActivate}
              disabled={activating}
              size="sm"
            >
              {activating
                ? "Activating..."
                : "Activate"}
            </Button>
          ) : (
            <div />
          )}

          <Link
            href={`/dashboard/teacher/projects/${project.id}`}
          >
            <Button variant="outline" size="sm">
              Open
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
