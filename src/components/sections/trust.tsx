import { Users, Lightbulb, Shield, FileSearch } from "lucide-react"

const trustPoints = [
  {
    icon: Users,
    title: "Human-in-the-Loop Grading",
    description: "AI provides suggestions, but human examiners always have the final say on grades and feedback.",
  },
  {
    icon: Lightbulb,
    title: "Explainable AI Feedback",
    description: "Every AI-generated score comes with clear reasoning and evidence from the submitted materials.",
  },
  {
    icon: Shield,
    title: "Consent-Based Data Handling",
    description: "Audio, video, and biometric data collection requires explicit student consent with transparent usage policies.",
  },
  {
    icon: FileSearch,
    title: "Comprehensive Audit Logs",
    description: "Complete audit trails for all examiner actions ensure accountability and academic integrity.",
  },
]

export function TrustSection() {
  return (
    <section className="border-y border-border bg-muted/20 py-20 md:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            <span className="text-balance">Trust & Transparency</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built with ethical AI principles and academic integrity at its core.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {trustPoints.map((point) => (
            <div key={point.title} className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <point.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{point.title}</h3>
                <p className="mt-1 text-muted-foreground">{point.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
