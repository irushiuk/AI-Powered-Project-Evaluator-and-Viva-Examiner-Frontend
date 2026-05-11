export function getPostLoginRedirect(role: string | undefined) {
  if (role === "student") return "/dashboard/student/sessions"
  if (role === "examiner" || role === "teacher") return "/dashboard/teacher"
  return "/dashboard"
}
