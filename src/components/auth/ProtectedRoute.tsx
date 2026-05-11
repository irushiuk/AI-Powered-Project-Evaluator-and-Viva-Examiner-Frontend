"use client"

import React, { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import useAuth from "@/hooks/useAuth"
import { getPostLoginRedirect } from "@/utils/routes"

function getRequiredRole(pathname: string) {
  if (pathname.startsWith("/dashboard/student")) return "student"
  if (pathname.startsWith("/dashboard/teacher")) return "teacher-or-examiner"
  return null
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated || !user) {
      router.replace("/login")
      return
    }

    const requiredRole = getRequiredRole(pathname)

    if (requiredRole === "student" && user.role !== "student") {
      router.replace(getPostLoginRedirect(user.role))
      return
    }

    if (requiredRole === "teacher-or-examiner" && user.role !== "teacher" && user.role !== "examiner") {
      router.replace(getPostLoginRedirect(user.role))
    }
  }, [isAuthenticated, isLoading, pathname, router, user])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Checking session...
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const requiredRole = getRequiredRole(pathname)
  if (requiredRole === "student" && user.role !== "student") return null
  if (requiredRole === "teacher-or-examiner" && user.role !== "teacher" && user.role !== "examiner") return null

  return <>{children}</>
}
