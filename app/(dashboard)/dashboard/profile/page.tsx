'use client'

import { Mail, ShieldCheck, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import FaceEnrollmentCard from '@/components/studentDashboard/FaceEnrollmentRegistrationCard'
import { useAuthContext } from '@/context/AuthContext'

export default function ProfilePage() {
  const { user } = useAuthContext()
  const isStudent = user?.role === 'student'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Your account details and face registration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{user?.full_name || 'Unknown user'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{user?.role}</span>
          </div>
        </CardContent>
      </Card>

      {isStudent && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Face registration</h2>
            <p className="text-sm text-muted-foreground">
              A viva is recorded as one video of everyone at once, so your
              answers are matched to you by face. Register here before your
              first session — you can re-register at any time.
            </p>
          </div>
          <FaceEnrollmentCard />
        </section>
      )}
    </div>
  )
}
