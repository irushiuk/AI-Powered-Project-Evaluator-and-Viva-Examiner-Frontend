import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import LoginForm from "@/components/auth/LoginForm"
import { COOKIE_NAMES } from "@/constants/storage"
import { getPostLoginRedirect } from "@/utils/routes"

export default async function LoginPage() {
  const cookieStore = await cookies()
  const hasSession = cookieStore.get(COOKIE_NAMES.hasSession)?.value === "true"
  const role = cookieStore.get(COOKIE_NAMES.userRole)?.value

  if (hasSession) {
    redirect(getPostLoginRedirect(role))
  }

  return <LoginForm />
}
