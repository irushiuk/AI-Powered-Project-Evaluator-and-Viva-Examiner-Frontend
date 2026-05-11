import { redirect } from 'next/navigation'

export default function AllSessionsRedirect() {
  // Old route — redirect to the new Explore Projects page
  redirect('/dashboard/student/projects/explore')
}
