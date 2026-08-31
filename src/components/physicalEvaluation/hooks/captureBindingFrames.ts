export type BindingBurstOptions = {
  count?: number
  intervalMs?: number
  quality?: number
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

/** Capture several moments so a blink or short head turn cannot ruin binding. */
export async function captureBindingFrames(
  video: HTMLVideoElement,
  options: BindingBurstOptions = {},
): Promise<Blob[]> {
  const count = Math.max(1, Math.min(10, options.count ?? 8))
  const intervalMs = Math.max(100, options.intervalMs ?? 350)
  const quality = options.quality ?? 0.88

  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("The camera preview is not ready yet.")
  }

  const canvas = document.createElement("canvas")
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Could not read the camera preview.")

  const frames: Blob[] = []
  for (let index = 0; index < count; index += 1) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const frame = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    )
    if (frame) frames.push(frame)
    if (index < count - 1) await delay(intervalMs)
  }

  if (!frames.length) throw new Error("Could not capture camera frames.")
  return frames
}
