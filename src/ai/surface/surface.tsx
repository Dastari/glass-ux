import { createContext, useContext, type ReactNode } from "react"

/**
 * Where AI output is drawn. On the canvas (the full-page conversation), cards are glass
 * layers (`glass-panel`). Inside a panel (the docked assistant, a window, the gallery), a
 * layer may not sit in a layer (R4.2), so the same cards use the `glass-control` fill.
 * Floating over the transcript (the composer and the ask dock), the surface is the blurred
 * `glass-overlay`, so text scrolling behind it never shows through; what sits inside it
 * (an ask's card) takes no material of its own.
 * Every AI card reads this instead of choosing a material itself.
 */
export type AiSurface = "canvas" | "panel" | "float"

const SurfaceContext = /* @__PURE__ */ createContext<AiSurface>("panel")

/** Choose the surrounding canvas, panel or floating surface so assistant cards use the appropriate material. */
export function AiSurfaceProvider({ surface, children }: {
  /** Where the cards below are drawn: `canvas` (glass-panel), `panel` (glass-control) or `float` (glass-overlay). */
  surface: AiSurface
  children: ReactNode
}) {
  return <SurfaceContext value={surface}>{children}</SurfaceContext>
}

/** The AiSurface from the nearest AiSurfaceProvider; `panel` when there is none. */
export function useAiSurface() {
  return useContext(SurfaceContext)
}

/** The material for a surface of its own (the composer) on the current surface. */
export function useCardMaterial() {
  const surface = useAiSurface()
  return surface === "canvas" ? "glass-panel" : surface === "float" ? "glass-overlay" : "glass-control"
}
