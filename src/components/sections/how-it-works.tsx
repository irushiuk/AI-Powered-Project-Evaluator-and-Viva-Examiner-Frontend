import { ClipboardList, Upload, Brain, CheckSquare } from "lucide-react"

const steps = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Examiner Creates Evaluation",
    description: "Set up evaluation criteria, rubrics, and deadlines for student project submissions.",
  },
  {
    icon: Upload,
    step: "02",
    title: "Student Submits Materials",
    description: "Students upload project reports, source code, and any supporting documentation.",
  },
  {
    icon: Brain,
    step: "03",
    title: "AI Conducts Analysis",
    description: "Our AI system analyzes submissions and provides preliminary scores with detailed feedback.",
  },
  {
    icon: CheckSquare,
    step: "04",
    title: "Examiner Reviews & Finalizes",
    description: "Examiners review AI suggestions, conduct viva sessions, and finalize grades.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-muted/30 py-20 md:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            <span className="text-balance">How It Works</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A streamlined four-step process that combines AI efficiency with human expertise.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {index < steps.length - 1 && (
                <div className="absolute right-0 top-12 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-primary/50 to-transparent lg:block" />
              )}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-card shadow-lg">
                    <step.icon className="h-10 w-10 text-primary" />
                  </div>
                  <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
