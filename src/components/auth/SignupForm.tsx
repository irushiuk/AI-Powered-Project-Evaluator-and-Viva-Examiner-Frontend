"use client"

import Link from "next/link"
import { useState } from "react"
import { GraduationCap, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import useAuth from "@/hooks/useAuth"

const degreePrograms = [
  "B.Sc.Eng. (Civil and Environmental Engineering)",
  "B.Sc.Eng. (Computer Engineering)",
  "B.Sc.Eng. (Electrical and Information Engineering)",
  "B.Sc.Eng. (Marine Engineering and Naval Architecture)",
  "B.Sc.Eng. (Mechanical and Manufacturing Engineering)",
]

export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [degreeProgram, setDegreeProgram] = useState("")
  const [error, setError] = useState<string | null>(null)
  const auth = useAuth()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = String(formData.get("password") || "")
    const confirmPassword = String(formData.get("confirmPassword") || "")

    if (!agreed) {
      setError("You must agree to the terms before creating an account.")
      return
    }

    if (!degreeProgram) {
      setError("Please select a degree program.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    try {
      await auth.registerStudent({
        full_name: String(formData.get("fullName") || ""),
        email: String(formData.get("email") || ""),
        password,
        confirm_password: confirmPassword,
        registration_number: String(formData.get("registerNumber") || ""),
        degree_program: degreeProgram,
        academic_year: Number(formData.get("academicYear") || 0),
        batch: String(formData.get("batch") || ""),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.1),transparent)]" />
      </div>

      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-semibold text-foreground">VivaSense</span>
      </Link>

      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>
            Join VivaSense to manage project evaluations and viva sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                <Input id="fullName" name="fullName" type="text" placeholder="John Doe" required autoComplete="name" />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">University Email</FieldLabel>
                <Input id="email" name="email" type="email" placeholder="name@university.edu" required autoComplete="email" />
              </Field>

              <Field>
                <FieldLabel htmlFor="registerNumber">Registration Number</FieldLabel>
                <Input id="registerNumber" name="registerNumber" type="text" placeholder="4798" required autoComplete="off" />
              </Field>

              <Field>
                <FieldLabel htmlFor="degreeProgram">Degree Program</FieldLabel>
                <Select value={degreeProgram} onValueChange={setDegreeProgram}>
                  <SelectTrigger id="degreeProgram">
                    <SelectValue placeholder="Select degree program" />
                  </SelectTrigger>
                  <SelectContent>
                    {degreePrograms.map((program) => (
                      <SelectItem key={program} value={program}>
                        {program}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="academicYear">Academic Year</FieldLabel>
                <Input id="academicYear" name="academicYear" type="number" placeholder="4" required autoComplete="off" min="1" max="10" />
              </Field>

              <Field>
                <FieldLabel htmlFor="batch">Batch</FieldLabel>
                <Input id="batch" name="batch" type="text" placeholder="2021" required autoComplete="off" />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                  </button>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
                  </button>
                </div>
              </Field>
            </FieldGroup>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full" size="lg" disabled={!agreed || auth.isLoading}>
              {auth.isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
