/**
 * tokens:allow-file — draws stand-in desktop screenshots as SVG data URIs for the AI image
 * results (a remote preview is a picture of someone else's screen, not our UI, so it has
 * its own colours). Gallery and template fixtures only.
 */

interface ScreenOptions {
  /** The window title on screen. */
  app: string
  /** Wallpaper hue. */
  hue: number
  /** A dialog over the app (an error, a print queue). */
  dialog?: string
  /** Available width or named width tier. */
  width?: number
  /** Available height used for the component’s size tier. */
  height?: number
}

const svg = (body: string, width: number, height: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`)}`

/** A Windows 11 desktop with one app window (and optionally a dialog), at 1600 × 1000. */
export function screenshot({ app, hue, dialog, width = 1600, height = 1000 }: ScreenOptions) {
  const rows = Array.from({ length: 9 }, (_, index) => {
    const y = 250 + index * 58
    const w = 520 + ((index * 137) % 380)
    return `<rect x="300" y="${y}" width="${w}" height="16" rx="8" fill="#d9dee7"/><rect x="${330 + w}" y="${y}" width="140" height="16" rx="8" fill="#e8ebf1"/>`
  }).join("")
  const sidebar = Array.from({ length: 7 }, (_, index) => `<rect x="190" y="${250 + index * 52}" width="70" height="14" rx="7" fill="#cfd5df"/>`).join("")
  const box = dialog
    ? `<g><rect x="560" y="360" width="480" height="230" rx="14" fill="#ffffff" stroke="#c9ced8"/><circle cx="612" cy="420" r="18" fill="#f2b33d"/><rect x="646" y="408" width="300" height="16" rx="8" fill="#5b6475"/><rect x="646" y="440" width="340" height="12" rx="6" fill="#c3c9d4"/><rect x="646" y="462" width="260" height="12" rx="6" fill="#c3c9d4"/><rect x="850" y="530" width="160" height="40" rx="8" fill="#2f6fde"/><text x="930" y="556" font-family="Segoe UI, Arial" font-size="17" fill="#fff" text-anchor="middle">OK</text><text x="646" y="398" font-family="Segoe UI, Arial" font-size="15" fill="#3b4252">${dialog}</text></g>`
    : ""
  const body = `
    <defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 62%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 65% 38%)"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#w)"/>
    <circle cx="1250" cy="260" r="260" fill="hsl(${(hue + 20) % 360} 80% 75% / 0.35)"/>
    <rect x="160" y="110" width="1280" height="740" rx="12" fill="#f6f7fa" stroke="#b9c0cc"/>
    <rect x="160" y="110" width="1280" height="54" rx="12" fill="#ffffff"/>
    <rect x="160" y="150" width="1280" height="14" fill="#ffffff"/>
    <text x="190" y="144" font-family="Segoe UI, Arial" font-size="18" fill="#2b3240">${app}</text>
    <rect x="1330" y="128" width="16" height="2" fill="#5b6475"/><rect x="1365" y="122" width="14" height="14" fill="none" stroke="#5b6475" stroke-width="2"/><path d="M1400 122l14 14m0-14l-14 14" stroke="#5b6475" stroke-width="2"/>
    <rect x="160" y="164" width="120" height="686" fill="#eef0f5"/>${sidebar}${rows}${box}
    <rect y="${height - 64}" width="${width}" height="64" fill="#f3f4f8" fill-opacity="0.92"/>
    <rect x="${width / 2 - 140}" y="${height - 48}" width="32" height="32" rx="6" fill="#2f6fde"/>
    <rect x="${width / 2 - 92}" y="${height - 48}" width="32" height="32" rx="6" fill="#e3a21a"/>
    <rect x="${width / 2 - 44}" y="${height - 48}" width="32" height="32" rx="6" fill="#1f9d6b"/>
    <rect x="${width / 2 + 4}" y="${height - 48}" width="32" height="32" rx="6" fill="#d24a4a"/>
    <text x="${width - 40}" y="${height - 26}" font-family="Segoe UI, Arial" font-size="15" fill="#2b3240" text-anchor="end">10:42 am</text>`
  return svg(body, width, height)
}
