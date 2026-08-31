export type BindingBurstOptions = {
  count?: number
  intervalMs?: number
  quality?: number
  maxAttempts?: number
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

function isObviouslyBlankFrame(context: CanvasRenderingContext2D, width: number, height: number) {
  const pixels = context.getImageData(0, 0, width, height).data
  let luminance = 0
  let samples = 0
  // Reject only a camera that is effectively black or fully white. Blur and
  // face visibility belong to the real detector on the backend. The previous
  // adjacent-pixel "detail" heuristic rejected clear webcam images before
  // they ever reached face recognition.
  for (let y = 0; y < height; y += 8) {
    for (let x = 0; x < width; x += 8) {
      const offset = (y * width + x) * 4
      const value =
        pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114
      luminance += value
      samples += 1
    }
  }
  const average = luminance / Math.max(1, samples)
  return average < 5 || average > 250
}

/** Capture five distinct, usable moments for temporal identity verification. */
export async function captureBindingFrames(
  video: HTMLVideoElement,
  options: BindingBurstOptions = {},
): Promise<Blob[]> {
  const count = Math.max(1, Math.min(10, options.count ?? 5))
  const intervalMs = Math.max(100, options.intervalMs ?? 300)
  const quality = options.quality ?? 0.88
  const maxAttempts = Math.max(count, Math.min(20, options.maxAttempts ?? 12))

  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("The camera preview is not ready yet.")
  }

  const canvas = document.createElement("canvas")
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Could not read the camera preview.")

  const frames: Blob[] = []
  for (let attempt = 0; attempt < maxAttempts && frames.length < count; attempt += 1) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (!isObviouslyBlankFrame(context, canvas.width, canvas.height)) {
      const frame = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      )
      if (frame) frames.push(frame)
    }
    if (frames.length < count) await delay(intervalMs)
  }

  if (frames.length < count) {
    throw new Error(
      `Only ${frames.length} of ${count} camera frames were captured. Check that the camera is uncovered and retry.`,
    )
  }
  return frames
}
