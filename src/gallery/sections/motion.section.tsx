import { useEffect, useRef, useState } from "react"
import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconEndpoint } from "../../icons/generated/icons.js"
import { ActionButton, Button } from "../../ui/button/index.js"
import { Skeleton } from "../../ui/skeleton/index.js"

const CURVES: Array<[string, [number, number, number, number], string]> = [
  ["--ease-standard", [0.2, 0, 0, 1], "State changes"],
  ["--ease-enter", [0.16, 1, 0.3, 1], "Things arriving"],
  ["--ease-exit", [0.4, 0, 1, 1], "Things leaving"],
  ["--ease-spring", [0.34, 1.45, 0.64, 1], "Ticks, toggles"],
]

function Curve({ points }: { points: [number, number, number, number] }) {
  const [x1, y1, x2, y2] = points
  const size = 96
  const p = (x: number, y: number) => `${x * size} ${size - y * size}`
  return (
    <svg viewBox={`-8 -24 ${size + 16} ${size + 48}`} className="motion-curve" aria-hidden>
      <path d={`M${p(0, 0)} L${p(1, 1)}`} className="motion-curve-guide" />
      <path d={`M${p(0, 0)} C${p(x1, y1)} ${p(x2, y2)} ${p(1, 1)}`} className="motion-curve-line" />
    </svg>
  )
}

/** Mount/unmount with the same data-starting-style / data-ending-style contract Base UI uses. */
function PopupDemo() {
  const [state, setState] = useState<"closed" | "starting" | "open" | "ending">("closed")
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const toggle = () => {
    clearTimeout(timer.current)
    if (state === "closed" || state === "ending") {
      setState("starting")
      requestAnimationFrame(() => requestAnimationFrame(() => setState("open")))
    } else {
      setState("ending")
      timer.current = setTimeout(() => setState("closed"), 200)
    }
  }
  return (
    <div className="motion-popup-stage">
      <Button onClick={toggle} iconEnd={<IconEndpoint />}>
        {state === "open" || state === "starting" ? "Close" : "Open"}
      </Button>
      {state !== "closed" ? (
        <div
          className="glass-overlay fa-popup motion-popup"
          data-side="bottom"
          data-starting-style={state === "starting" ? "" : undefined}
          data-ending-style={state === "ending" ? "" : undefined}
        >
          {["Connect", "View only", "File transfer"].map((label) => (
            <div key={label} className="fa-item">
              <IconEndpoint />
              <span className="fa-item-label">{label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FlashDemo() {
  const [value, setValue] = useState(34)
  useEffect(() => {
    const id = setInterval(() => setValue(20 + Math.round(Math.random() * 60)), 2200)
    return () => clearInterval(id)
  }, [])
  return (
    <span key={value} className="motion-flash type-title" data-numeric>
      CPU {value}%
    </span>
  )
}

export default function MotionSection() {
  return (
    <SectionPage>
      <Specimen title="Curves" description="Four easings. Durations: instant 80, fast 140, base 200, slow 300, slower 450 ms — all × --motion-scale." wide>
        {CURVES.map(([token, points, use]) => (
          <figure key={token} className="motion-curve-cell">
            <Curve points={points} />
            <code className="type-caption">{token}</code>
            <span className="type-caption text-fg-muted">{use}</span>
          </figure>
        ))}
      </Specimen>
      <Specimen title="Enter and exit" description="Overlays scale from 96% and rise 6px on enter; exits are quicker and accelerate away.">
        <PopupDemo />
      </Specimen>
      <Specimen title="Press and confirm" description="Press scales to 97%. A completed action draws its tick on the spring curve.">
        <Button variant="primary">Press me</Button>
        <ActionButton onAction={() => new Promise((resolve) => setTimeout(resolve, 900))} pendingLabel="Saving…" successLabel="Saved">
          Save changes
        </ActionButton>
      </Specimen>
      <Specimen title="Live change and loading" description="A live update flashes the value once. Skeletons share one shimmer clock." layout="stack">
        <FlashDemo />
        <div className="flex flex-col gap-2">
          <Skeleton.Text type="subtitle" width="40%" />
          <Skeleton.Text type="body" lines={2} width="65%" />
        </div>
      </Specimen>
      <Rules
        do={["Animate to explain where something came from or went.", "Use the motion vocabulary and duration tokens."]}
        dont={["Loop animations other than spinners and skeletons.", "Depend on an animation finishing for anything to work."]}
      />
      <TokenTable
        tokens={[
          ["--motion-scale", "Multiplies every duration"],
          ["--duration-base", "Overlays, most transitions"],
          ["--duration-fast", "State changes, exits"],
          ["--press-scale", "Press feedback"],
          ["--overlay-enter-scale", "Overlay start scale"],
          ["--overlay-enter-shift", "Overlay rise"],
        ]}
      />
    </SectionPage>
  )
}
