'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Send, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { submitProjectWorkAction } from '@/actions/projectActions'

interface SubmissionFormProps {
  projectId: string
  onSuccess: () => void
}

export function SubmissionForm({ projectId, onSuccess }: SubmissionFormProps) {
  const [repoUrl, setRepoUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pptFile, setPptFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportError, setReportError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!file) {
      setReportError('Please upload a report file (PDF).')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('github_repo_url', repoUrl)
      if (file) {
        formData.append('report_file', file)
      }
      if (pptFile) {
        formData.append('presentation_file', pptFile)
      }

      const result = await submitProjectWorkAction(projectId, formData)
      if (!result.ok) {
        toast.error(result.error)
        setReportError(result.error)
        return
      }

      toast.success('Project work submitted successfully!')
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit work')
      setReportError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsSubmitting(false)
    }
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
        <Label htmlFor="report">Upload Project Report</Label>
        <div className="cursor-pointer rounded-lg border-2 border-dashed border-border p-6 text-center transition hover:bg-secondary/50">
          <input
            id="report"
            type="file"
            accept=".pdf,application/pdf"
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
            <p className="text-xs text-muted-foreground">PDF files only</p>
          </label>
        </div>
        {reportError && <p className="text-sm text-destructive">{reportError}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ppt">Presentation (optional)</Label>
        <div className="cursor-pointer rounded-lg border-2 border-dashed border-border p-6 text-center transition hover:bg-secondary/50">
          <input
            id="ppt"
            type="file"
            accept=".ppt,.pptx"
            onChange={(e) => setPptFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <label htmlFor="ppt" className="cursor-pointer">
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {pptFile ? pptFile.name : 'Click to upload your slides'}
            </p>
            <p className="text-xs text-muted-foreground">PPT / PPTX files only</p>
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Project'}
        <Send className="ml-2 h-4 w-4" />
      </Button>
    </form>
  )
}
