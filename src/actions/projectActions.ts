"use server"

import { revalidatePath } from "next/cache"
import { PROJECT_API } from "@/constants/api.constant"
import { serverFetch } from "@/services/serverApi"

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export async function enrollInProjectAction(
  projectId: string,
  groupNumber?: string
): Promise<ActionResult> {
  try {
    const res = await serverFetch(PROJECT_API.enroll(projectId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupNumber ? { group_number: groupNumber } : {}),
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
      return { ok: false, error: errData.message || "Failed to submit" }
    }

    revalidatePath(`/dashboard/student/projects/${projectId}`)
    revalidatePath("/dashboard/student/projects")

    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to submit" }
  }
}
