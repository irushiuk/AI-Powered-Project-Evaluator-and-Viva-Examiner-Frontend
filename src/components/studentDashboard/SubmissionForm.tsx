'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Send, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SubmissionForm() {
  const [repoUrl, setRepoUrl] = useState('')
  const [reportUrl, setReportUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportError, setReportError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!reportUrl && !file) {
      setReportError('Add a report link or upload a report file.')
      return
    }

    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setRepoUrl('')
    setReportUrl('')
    setFile(null)
    setReportError('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="repo">GitHub Repository URL</Label>
        <Input
          id="repo"
          placeholder="https://github.com/username/project"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-link">Project Report Link</Label>
        <Input
          id="report-link"
          type="url"
          placeholder="https://drive.google.com/your-report"
          value={reportUrl}
          onChange={(e) => {
            setReportUrl(e.target.value)
            setReportError('')
          }}
        />
        <p className="text-xs text-muted-foreground">
          Add a shareable report link, or upload a file below.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="report">Upload Project Report</Label>
        <div className="cursor-pointer rounded-lg border-2 border-dashed border-border p-6 text-center transition hover:bg-secondary/50">
          <input
            id="report"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null)
              setReportError('')
            }}
            className="hidden"
          />
          <label htmlFor="report" className="cursor-pointer">
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {file ? file.name : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground">PDF or DOC files only</p>
          </label>
        </div>
        {reportError && <p className="text-sm text-destructive">{reportError}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Project'}
        <Send className="ml-2 h-4 w-4" />
      </Button>
    </form>
  )
}
