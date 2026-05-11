import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAMES } from "@/constants/storage"
import { getPostLoginRedirect } from "@/utils/routes"
import SignupForm from "../../../src/components/auth/SignupForm"

export default async function SignupPage() {
  const cookieStore = await cookies()
  const hasSession = cookieStore.get(COOKIE_NAMES.hasSession)?.value === "true"
  const role = cookieStore.get(COOKIE_NAMES.userRole)?.value

  if (hasSession) {
    redirect(getPostLoginRedirect(role))
  }

  return <SignupForm />
}
