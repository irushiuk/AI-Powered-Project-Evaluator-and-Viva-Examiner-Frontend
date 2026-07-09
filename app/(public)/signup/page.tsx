import { redirect } from "next/navigation"
import { getServerUser } from "@/services/serverApi"
import { getPostLoginRedirect } from "@/utils/routes"
import SignupForm from "../../../src/components/auth/SignupForm"

export default async function SignupPage() {
  const user = await getServerUser()

  if (user) {
    redirect(getPostLoginRedirect(user.role))
  }

  return <SignupForm />
}
