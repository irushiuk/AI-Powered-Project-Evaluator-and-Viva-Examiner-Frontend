import Link from "next/link"
import { ArrowRight, CheckCircle2, FileText, Code, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-22">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]" />
      </div>

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Trusted by universities worldwide
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              <span className="text-balance">AI-Powered Project Evaluator and Viva Examiner</span>
            </h1>

            <p className="max-w-xl text-lg text-muted-foreground">
              A human-in-the-loop platform that helps examiners evaluate project reports, source code, and viva performance with transparent AI-assisted feedback.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-foreground hover:text-foreground">
                <Link href="#features">View Features</Link>
              </Button>
            </div>

            <div className="flex gap-4">
                <Link href="/dashboard/student">
                  <Button>I'm a Student</Button>
                </Link>

                <Link href="/dashboard/teacher">
                  <Button>I'm a Teacher</Button>
                </Link>
              </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Human-in-the-loop
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Explainable AI
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Privacy-first
              </div>
            </div>
          </div>

          {/* Dashboard Preview Card */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/10 to-primary/5 blur-2xl" />
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                <div className="h-3 w-3 rounded-full bg-green-400/60" />
                <span className="ml-2 text-xs text-muted-foreground">VivaSense Dashboard</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Project Report Analysis</p>
                      <p className="text-xs text-muted-foreground">AI evaluation complete</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600">92%</span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Code className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Source Code Review</p>
                      <p className="text-xs text-muted-foreground">Quality metrics analyzed</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">88%</span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <Mic className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Viva Examination</p>
                      <p className="text-xs text-muted-foreground">Awaiting examiner review</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-600">Pending</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">Last updated: Just now</span>
                <Button size="sm" variant="secondary">View Details</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
