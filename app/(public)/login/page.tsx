import { redirect } from "next/navigation"
import LoginForm from "@/components/auth/LoginForm"
import { getServerUser } from "@/services/serverApi"
import { getPostLoginRedirect } from "@/utils/routes"

export default async function LoginPage() {
  const user = await getServerUser()

  if (user) {
    redirect(getPostLoginRedirect(user.role))
  }

  return <LoginForm />
}
