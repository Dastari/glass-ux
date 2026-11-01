import { useEffect, useRef, useState } from "react"

/**
 * A slideshow's clock. It runs one interval at a time, from when `ready` turns true for the
 * step shown, and starts that interval over when the document comes back from being hidden
 * (R17.2). It renders nothing: what it shows and says belongs to the viewer.
 */
export function useSlideshow({ interval, ready, step, advance }: { interval: number; ready: boolean; step: number; advance: () => void }) {
  const [playing, setPlaying] = useState(false)
  const latest = useRef(advance)
  latest.current = advance
  useEffect(() => {
    if (!playing || !ready) return
    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      clearTimeout(timer)
      if (!document.hidden) timer = setTimeout(() => latest.current(), interval)
    }
    arm()
    document.addEventListener("visibilitychange", arm)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", arm)
    }
  }, [playing, ready, interval, step])
  return [playing, setPlaying] as const
}
