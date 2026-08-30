'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, Images, Loader2, ScanFace, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { facePhotoService, type FacePhotoState } from '@/services/facePhotoService'
import FaceEnrollmentWizard from './FaceEnrollmentWizard'

const EMPTY_STATE: FacePhotoState = {
  has_photo: false,
  photo_url: null,
  sample_urls: [],
  sample_count: 0,
  registration_status: 'required',
}

export default function FaceEnrollmentRegistrationCard() {
  const [state, setState] = useState<FacePhotoState | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    facePhotoService.get().then((value) => {
      if (cancelled) return
      setState({
        ...EMPTY_STATE,
        ...value,
        sample_urls: value.sample_urls || (value.photo_url ? [value.photo_url] : []),
        sample_count: value.sample_count ?? (value.has_photo ? 1 : 0),
        registration_status: value.registration_status || (value.has_photo ? 'needs_improvement' : 'required'),
      })
    }).catch(() => {
      if (!cancelled) setState(null)
    })
    return () => { cancelled = true }
  }, [])

  function completed(value: FacePhotoState) {
    setState(value)
    setWizardOpen(false)
    toast.success(`Face registration complete with ${value.sample_count} verified samples.`)
  }

  async function uploadFiles(files: File[]) {
    if (files.length < 3 || files.length > 5) {
      toast.error('Select between 3 and 5 face photos.')
      return
    }
    if (files.some((file) => !/\.(jpe?g|png)$/i.test(file.name))) {
      toast.error('Every sample must be a JPG or PNG image.')
      return
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      toast.error('Each sample must be under 5MB.')
      return
    }
    setUploading(true)
    try {
      completed(await facePhotoService.upload(files))
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not register these samples.')
    } finally {
      setUploading(false)
    }
  }

  function onFilesPicked(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (files.length) void uploadFiles(files)
  }

  if (!state) return null

  if (wizardOpen) {
    return (
      <Card className="overflow-hidden border-blue-200 shadow-sm">
        <FaceEnrollmentWizard onSaved={completed} onCancel={() => setWizardOpen(false)} />
      </Card>
    )
  }

  const complete = state.registration_status === 'complete' && state.sample_count >= 3

  return (
    <Card className={complete ? 'border-emerald-200 bg-emerald-50/30' : 'border-blue-200 bg-blue-50/50'}>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {state.photo_url ? (
            <div className="relative shrink-0">
              <img src={state.photo_url} alt="Primary face enrollment sample" className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-sm" />
              {complete && <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white text-emerald-600" />}
            </div>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <ScanFace className="h-6 w-6 text-blue-600" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-950">
              {complete ? 'Face registration complete' : state.has_photo ? 'Improve your face registration' : 'Register your face'}
            </p>
            <p className="mt-0.5 text-sm text-gray-600">
              {complete
                ? `${state.sample_count} complementary samples are ready for reliable group-viva identification.`
                : state.has_photo
                  ? `Only ${state.sample_count} legacy sample is available. Complete the guided capture for more reliable identification.`
                  : 'Capture five guided views so the physical kiosk can identify you reliably.'}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
              <Images className="h-3.5 w-3.5" /> {state.sample_count} of 5 samples registered
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" onClick={() => setWizardOpen(true)} disabled={uploading}>
            <Camera className="h-4 w-4" /> {complete ? 'Re-register' : 'Start guided capture'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload 3–5 photos
          </Button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple onChange={onFilesPicked} className="hidden" />
        </div>
      </CardContent>
    </Card>
  )
}
