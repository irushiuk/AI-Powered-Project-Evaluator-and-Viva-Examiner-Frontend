import { FileText, Code2, MessageSquare, Mic, ClipboardCheck, UserCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: FileText,
    title: "AI Report Evaluation",
    description: "Automatically analyze project reports for structure, content quality, and adherence to academic standards.",
  },
  {
    icon: Code2,
    title: "Source Code Analysis",
    description: "Deep analysis of code quality, best practices, documentation, and functionality assessment.",
  },
  {
    icon: MessageSquare,
    title: "AI Viva Question Generation",
    description: "Intelligent question generation based on submitted materials to thoroughly assess student understanding.",
  },
  {
    icon: Mic,
    title: "Speech-to-Text Answer Review",
    description: "Real-time transcription and analysis of student responses during viva examination sessions.",
  },
  {
    icon: ClipboardCheck,
    title: "Rubric-Based Scoring",
    description: "Consistent and fair evaluation using customizable rubrics aligned with institutional standards.",
  },
  {
    icon: UserCheck,
    title: "Examiner Final Approval",
    description: "Human-in-the-loop verification ensures AI suggestions are reviewed before final grade assignment.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            <span className="text-balance">Powerful Features for Modern Evaluation</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Comprehensive tools designed to streamline project evaluation while maintaining academic integrity.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="group relative overflow-hidden border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
