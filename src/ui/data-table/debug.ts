/**
 * Development-only render accounting, so tests can prove that typing, resizing or
 * selecting one row does not re-render the others. Compiled out of production builds.
 */
declare global {
  interface Window {
    faDataTableRenders?: { rows: number; cards: number }
  }
}

export function countRender(kind: "rows" | "cards") {
  if (!import.meta.env.DEV || typeof window === "undefined") return
  const counts = (window.faDataTableRenders ??= { rows: 0, cards: 0 })
  counts[kind]++
}
