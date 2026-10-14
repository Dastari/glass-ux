/**
 * tokens:allow-file colour maths needs literal channel values.
 *
 * Contrast maths for the Colour section: resolve any CSS colour the browser computes
 * (including oklch with alpha) to sRGB via a canvas, then WCAG relative luminance.
 */
let context: CanvasRenderingContext2D | null = null

function rgba(color: string): [number, number, number, number] {
  context ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true })
  if (!context) return [0, 0, 0, 1]
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = "#000"
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0, a = 255] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b, a / 255]
}

const channel = (v: number) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: [number, number, number]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Composite a (possibly translucent) foreground over an opaque background. */
function over(fg: [number, number, number, number], bg: [number, number, number, number]): [number, number, number] {
  const a = fg[3]
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)]
}

export function contrastRatio(foreground: string, background: string, base: string): number {
  const baseRgb = rgba(base)
  const bg = over(rgba(background), baseRgb)
  const fg = over(rgba(foreground), [...bg, 1])
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a) as [number, number]
  return (l1 + 0.05) / (l2 + 0.05)
}
