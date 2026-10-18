/**
 * Motion for script: the same switch and duration tokens CSS uses (tokens.css, motion.css).
 *
 * Every timer that waits for an animation, and every effect script animates, reads its
 * timing here, so "Still" in Appearance (`data-motion="reduced"`), the operating system's
 * reduced-motion preference and an explicit "Animated" (`data-motion="full"`) mean the same
 * thing to script as to CSS.
 */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

const documentRoot = () => (typeof document === "undefined" ? null : document.documentElement)

/**
 * Whether interface motion is reduced: Appearance "Still" (`data-motion="reduced"`), or the
 * operating system's reduced-motion preference unless Appearance forces "Animated"
 * (`data-motion="full"`). This is the rule the CSS motion switch applies.
 */
export function prefersReducedMotion(root: HTMLElement | null = documentRoot()): boolean {
  const motion = root?.dataset.motion
  if (motion === "reduced") return true
  if (motion === "full") return false
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION).matches
}

/**
 * The `--motion-scale` knob: 1 normally, near zero under reduced motion. Multiply a duration
 * by it, or skip an animation when it is near zero. Reads the computed token, so a host that
 * sets its own scale is honoured; falls back to the switch when no stylesheet is loaded.
 */
export function motionScale(root: HTMLElement | null = documentRoot()): number {
  if (!root || typeof getComputedStyle !== "function") return prefersReducedMotion(root) ? 0 : 1
  const value = Number.parseFloat(getComputedStyle(root).getPropertyValue("--motion-scale"))
  if (Number.isFinite(value)) return value
  return prefersReducedMotion(root) ? 0 : 1
}

/** Parse a CSS time ("200ms", "0.2s") to milliseconds. */
function parseTime(value: string): number | null {
  const match = /^\s*(-?[\d.]+)(ms|s)\s*$/.exec(value)
  if (!match) return null
  const amount = Number.parseFloat(match[1] ?? "")
  if (!Number.isFinite(amount)) return null
  return match[2] === "s" ? amount * 1000 : amount
}

/**
 * A duration token in milliseconds as it computes on `root` (e.g. `--duration-slow`, already
 * multiplied by `--motion-scale`). Returns `fallback` when the token is not available.
 */
export function tokenDuration(token: string, fallback = 0, root: HTMLElement | null = documentRoot()): number {
  if (!root || typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback
  const probe = document.createElement("span")
  probe.hidden = true
  probe.style.transitionDuration = `var(${token})`
  root.append(probe)
  const ms = parseTime(getComputedStyle(probe).transitionDuration)
  probe.remove()
  return ms ?? fallback
}

/** A duration in milliseconds scaled by the motion knob: near zero under reduced motion. */
export function scaledDuration(ms: number, root: HTMLElement | null = documentRoot()): number {
  return ms * motionScale(root)
}

const FEEDBACK_HOLD_FALLBACK = 1800

/**
 * How long a completed action shows its ✓ or ✕ before resting: the `--feedback-hold` token
 * (tokens.css), 1800 ms by default. It is a reading time, not an animation, so reduced
 * motion does not shorten it.
 */
export function feedbackHold(root: HTMLElement | null = documentRoot()): number {
  if (!root || typeof getComputedStyle !== "function") return FEEDBACK_HOLD_FALLBACK
  return parseTime(getComputedStyle(root).getPropertyValue("--feedback-hold")) ?? FEEDBACK_HOLD_FALLBACK
}

let shimmerInstalls = 0
let removeShimmer: (() => void) | null = null

/**
 * Start every shimmer sweep (`fa-shimmer`) on the document clock, so the placeholders on a
 * page pulse in one beat whenever they mount. One capturing `animationstart` listener; it
 * only aligns start times and never animates anything itself. Reference-counted;
 * `AppearanceProvider` installs it.
 */
export function installShimmerSync(): () => void {
  if (typeof document === "undefined") return () => {}
  shimmerInstalls += 1
  if (shimmerInstalls === 1) {
    const align = (event: AnimationEvent) => {
      if (event.animationName !== "fa-sweep" || !(event.target instanceof Element)) return
      for (const animation of event.target.getAnimations({ subtree: true })) {
        if ("animationName" in animation && animation.animationName === "fa-sweep" && animation.startTime !== 0) animation.startTime = 0
      }
    }
    document.addEventListener("animationstart", align, true)
    removeShimmer = () => document.removeEventListener("animationstart", align, true)
  }
  let removed = false
  return () => {
    if (removed) return
    removed = true
    shimmerInstalls -= 1
    if (shimmerInstalls === 0) {
      removeShimmer?.()
      removeShimmer = null
    }
  }
}
