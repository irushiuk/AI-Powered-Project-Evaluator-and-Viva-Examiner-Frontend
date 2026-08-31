import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type EnrollmentFrameMetrics = {
  noseX: number
  noseY: number
}

export type EnrollmentQualityResult =
  | { ok: true; metrics: EnrollmentFrameMetrics }
  | { ok: false; message: string }

function lightingAndDetail(canvas: HTMLCanvasElement) {
  const sample = document.createElement('canvas')
  sample.width = 160
  sample.height = 90
  const context = sample.getContext('2d', { willReadFrequently: true })
  if (!context) return { brightness: 128, detail: 10 }
  context.drawImage(canvas, 0, 0, sample.width, sample.height)
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data
  const gray = new Float32Array(sample.width * sample.height)
  let brightness = 0
  for (let pixel = 0, index = 0; pixel < pixels.length; pixel += 4, index += 1) {
    const value = pixels[pixel] * .299 + pixels[pixel + 1] * .587 + pixels[pixel + 2] * .114
    gray[index] = value
    brightness += value
  }
  let detail = 0
  for (let y = 1; y < sample.height; y += 1) {
    for (let x = 1; x < sample.width; x += 1) {
      const index = y * sample.width + x
      detail += Math.abs(gray[index] - gray[index - 1])
      detail += Math.abs(gray[index] - gray[index - sample.width])
    }
  }
  return {
    brightness: brightness / gray.length,
    detail: detail / ((sample.width - 1) * (sample.height - 1) * 2),
  }
}

export function assessEnrollmentFrame(
  landmarks: NormalizedLandmark[],
  canvas: HTMLCanvasElement,
  stepIndex: number,
  previous: EnrollmentFrameMetrics[],
): EnrollmentQualityResult {
  const xs = landmarks.map((point) => point.x)
  const ys = landmarks.map((point) => point.y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const y0 = Math.min(...ys), y1 = Math.max(...ys)
  const width = x1 - x0, height = y1 - y0
  const centerX = (x0 + x1) / 2, centerY = (y0 + y1) / 2

  if (height < .28 || width < .16) {
    return { ok: false, message: 'Move closer so your face fills the guide.' }
  }
  if (height > .82 || width > .7) {
    return { ok: false, message: 'Move slightly farther from the camera.' }
  }
  if (centerX < .28 || centerX > .72 || centerY < .25 || centerY > .68) {
    return { ok: false, message: 'Center your complete face inside the guide.' }
  }

  const { brightness, detail } = lightingAndDetail(canvas)
  if (brightness < 45) return { ok: false, message: 'Your face is too dark. Add light in front of you.' }
  if (brightness > 225) return { ok: false, message: 'The image is overexposed. Reduce the light.' }
  if (detail < 5) return { ok: false, message: 'The image looks blurred. Hold still and clean the lens.' }

  const nose = landmarks[1]
  const noseX = (nose.x - x0) / Math.max(width, .001)
  const noseY = (nose.y - y0) / Math.max(height, .001)
  const front = previous[0]

  if (stepIndex === 0 && (noseX < .38 || noseX > .62)) {
    return { ok: false, message: 'Look directly toward the camera for the first sample.' }
  }
  if (stepIndex === 1 && front && Math.abs(noseX - front.noseX) < .035) {
    return { ok: false, message: 'Turn your head slightly to the side, while keeping both eyes visible.' }
  }
  if (stepIndex === 2 && front && previous[1]) {
    const firstTurn = previous[1].noseX - front.noseX
    const secondTurn = noseX - front.noseX
    if (Math.abs(secondTurn) < .035 || firstTurn * secondTurn >= 0) {
      return { ok: false, message: 'Turn toward the opposite side for this sample.' }
    }
  }
  if (stepIndex === 4 && front && Math.abs(noseX - front.noseX) > .1) {
    return { ok: false, message: 'Return to a front-facing position for the final sample.' }
  }

  return { ok: true, metrics: { noseX, noseY } }
}
