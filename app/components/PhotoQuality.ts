// Client-side photo quality analyzer — no API calls, uses canvas pixel analysis

export interface QualityResult {
  passed: boolean
  score: number // 0-100
  issues: string[]
  suggestion: string
}

export async function analyzePhotoQuality(dataUrl: string): Promise<QualityResult> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 400
      const scale = Math.min(MAX / img.width, MAX / img.height, 1)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = imageData.data

      const issues: string[] = []
      let score = 100

      // ── 1. BRIGHTNESS CHECK ──
      let totalBrightness = 0
      let darkPixels = 0
      let brightPixels = 0
      const total = pixels.length / 4
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i+1], b = pixels[i+2]
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b)
        totalBrightness += brightness
        if (brightness < 40) darkPixels++
        if (brightness > 240) brightPixels++
      }
      const avgBrightness = totalBrightness / total
      const darkRatio = darkPixels / total
      const brightRatio = brightPixels / total

      if (avgBrightness < 50 || darkRatio > 0.6) {
        issues.push('Photo is too dark')
        score -= 35
      } else if (avgBrightness < 80) {
        issues.push('Photo is underexposed — find better lighting')
        score -= 15
      }
      if (brightRatio > 0.4) {
        issues.push('Photo is overexposed / too much glare')
        score -= 20
      }

      // ── 2. BLUR CHECK (Laplacian variance) ──
      // Convert to grayscale and compute edge strength
      const gray: number[] = []
      for (let i = 0; i < pixels.length; i += 4) {
        gray.push(0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2])
      }
      const w = canvas.width, h = canvas.height
      let laplacianSum = 0
      let laplacianCount = 0
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x
          const lap = Math.abs(
            -gray[idx - w - 1] - gray[idx - w] - gray[idx - w + 1]
            - gray[idx - 1] + 8 * gray[idx] - gray[idx + 1]
            - gray[idx + w - 1] - gray[idx + w] - gray[idx + w + 1]
          )
          laplacianSum += lap
          laplacianCount++
        }
      }
      const sharpness = laplacianSum / laplacianCount

      if (sharpness < 3) {
        issues.push('Photo is too blurry — hold phone steady')
        score -= 40
      } else if (sharpness < 6) {
        issues.push('Photo is slightly blurry — try again')
        score -= 20
      }

      // ── 3. RESOLUTION CHECK ──
      if (img.width < 640 || img.height < 480) {
        issues.push('Photo resolution is too low')
        score -= 25
      }

      // ── 4. MOSTLY ONE COLOR (lens cap, finger over lens, etc) ──
      let rSum = 0, gSum = 0, bSum = 0
      for (let i = 0; i < pixels.length; i += 4) {
        rSum += pixels[i]; gSum += pixels[i+1]; bSum += pixels[i+2]
      }
      const rAvg = rSum/total, gAvg = gSum/total, bAvg = bSum/total
      let colorVariance = 0
      for (let i = 0; i < pixels.length; i += 4) {
        colorVariance += Math.abs(pixels[i] - rAvg) + Math.abs(pixels[i+1] - gAvg) + Math.abs(pixels[i+2] - bAvg)
      }
      colorVariance /= total
      if (colorVariance < 8) {
        issues.push('Photo appears to be a solid color — check lens')
        score -= 50
      }

      score = Math.max(0, Math.min(100, score))
      const passed = score >= 55 && issues.length === 0 || (score >= 70 && issues.length <= 1 && !issues.some(i => i.includes('blurry') || i.includes('dark')))

      const suggestion = issues.length === 0
        ? 'Photo looks good!'
        : issues.includes('too blurry') || issues.some(i => i.includes('blurry'))
        ? 'Hold your phone steady with both hands and tap the screen to focus on the truck before taking the photo.'
        : issues.some(i => i.includes('dark'))
        ? 'Move to a brighter area or turn on more lights. Avoid shooting into direct sunlight.'
        : issues.some(i => i.includes('glare'))
        ? 'Reposition to avoid direct sunlight on the vehicle. Try shooting from a slightly different angle.'
        : 'Retake the photo and ensure the truck is clearly visible and in focus.'

      resolve({ passed, score, issues, suggestion })
    }
    img.onerror = () => resolve({ passed: true, score: 80, issues: [], suggestion: '' })
    img.src = dataUrl
  })
}
