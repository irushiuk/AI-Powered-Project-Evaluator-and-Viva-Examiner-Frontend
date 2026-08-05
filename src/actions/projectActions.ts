"use server"

import { revalidatePath } from "next/cache"
import { PROJECT_API } from "@/constants/api.constant"
import { serverFetch } from "@/services/serverApi"

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export async function enrollInProjectAction(
  projectId: string,
  groupNumber?: string,
  memberEmails?: string[]
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {}
    if (groupNumber) body.group_number = groupNumber
    if (memberEmails && memberEmails.length) body.member_emails = memberEmails

    const res = await serverFetch(PROJECT_API.enroll(projectId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { ok: false, error: errData.message || "Failed to enroll" }
    }

    revalidatePath("/dashboard/student/projects")
    revalidatePath("/dashboard/student/projects/explore")

    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to enroll" }
  }
}

export async function submitProjectWorkAction(
  projectId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const res = await serverFetch(PROJECT_API.submitWork(projectId), {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error("[submitProjectWorkAction] Error response:", res.status, errData)
      
      let errorMsg = errData.error || errData.detail || errData.message
      if (!errorMsg && typeof errData === 'object') {
        // Handle Django REST framework field errors e.g. {"report_file": ["Only PDF..."]}
        const firstKey = Object.keys(errData)[0]
        if (firstKey && Array.isArray(errData[firstKey])) {
          errorMsg = errData[firstKey][0]
        } else if (firstKey && typeof errData[firstKey] === 'string') {
          errorMsg = errData[firstKey]
        }
      }
      
      return { 
        ok: false, 
        error: errorMsg || `Failed to submit (${res.status})` 
      }
    }

    revalidatePath(`/dashboard/student/projects/${projectId}`)
    revalidatePath("/dashboard/student/projects")

    return { ok: true }
  } catch (error) {
    console.error("[submitProjectWorkAction] Exception:", error)
    return { ok: false, error: error instanceof Error ? error.message : "Failed to submit" }
  }
}
