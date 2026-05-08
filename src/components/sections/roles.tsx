import { GraduationCap, ShieldCheck, Upload, Eye, Mic2, MessageCircle, ClipboardList, Settings, BarChart3, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const studentFeatures = [
  { icon: Upload, text: "Submit project materials" },
  { icon: CheckCircle, text: "Give consent for evaluation" },
  { icon: Mic2, text: "Attend viva sessions" },
  { icon: MessageCircle, text: "View AI-generated feedback" },
]

const examinerFeatures = [
  { icon: ClipboardList, text: "Create evaluations & rubrics" },
  { icon: Settings, text: "Manage assessment criteria" },
  { icon: BarChart3, text: "Review AI analysis scores" },
  { icon: CheckCircle, text: "Finalize and approve grades" },
]

export function RolesSection() {
  return (
    <section id="roles" className="py-20 md:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            <span className="text-balance">Role-Based Access</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tailored experiences for students and examiners within a unified platform.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <Card className="relative overflow-hidden border-border bg-card">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-3xl" />
            <CardHeader className="pb-4">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Student Portal</CardTitle>
              <CardDescription className="text-base">
                Submit your work, participate in viva sessions, and receive detailed feedback on your performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {studentFeatures.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-border bg-card">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-accent/10 blur-3xl" />
            <CardHeader className="pb-4">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[accent/10]">
                <ShieldCheck className="h-7 w-7  text-[#FF854C]" />
              </div>
              <CardTitle className="text-2xl">Examiner/Admin Portal</CardTitle>
              <CardDescription className="text-base">
                Create evaluations, manage rubrics, review AI-assisted scores, and finalize student grades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {examinerFeatures.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <feature.icon className="h-4 w-4 text-[#FF854C]" />
                    </div>
                    <span className="text-sm text-foreground">{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
