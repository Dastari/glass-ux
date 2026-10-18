import { useEffect, useRef, useState } from "react"
import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconAi, IconEndpoint, IconTerminal } from "../../icons/generated/icons.js"
import { TabBar } from "../../shell/index.js"
import { Accordion } from "../../ui/accordion/index.js"
import { Slider } from "../../ui/slider/index.js"
import { ActionButton, Button } from "../../ui/button/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { Skeleton } from "../../ui/skeleton/index.js"
import { Switch } from "../../ui/switch/index.js"
import { Tabs } from "../../ui/tabs/index.js"
import { Tooltip } from "../../ui/tooltip/index.js"

type Bezier = [number, number, number, number]

const TWEENS: Array<[string, Bezier, string]> = [
  ["--ease-standard", [0.2, 0, 0, 1], "State changes"],
  ["--ease-enter", [0.16, 1, 0.3, 1], "Things arriving"],
  ["--ease-exit", [0.4, 0, 1, 1], "Things leaving"],
]

/** Damping ratio and settle constant of each spring token (tokens.css samples the same curves). */
const SPRINGS: Array<[string, number, number, string]> = [
  ["--ease-spring", 0.55, 6.2, "Ticks, toggles"],
  ["--ease-glide", 0.7, 6, "Selection indicators"],
  ["--ease-bounce", 0.45, 6.5, "Press release, pops"],
  ["--ease-materialise", 0.82, 6, "Overlays emerging"],
]

const SIZE = 96
const point = (x: number, y: number) => `${x * SIZE} ${SIZE - y * SIZE}`

/** A damped spring from rest, x(t) for t in [0, 1]. */
function springPath(zeta: number, settle: number) {
  const omega = settle / zeta
  const damped = omega * Math.sqrt(1 - zeta * zeta)
  const steps = 48
  const points = Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps
    const x = index === steps ? 1 : 1 - Math.exp(-zeta * omega * t) * (Math.cos(damped * t) + ((zeta * omega) / damped) * Math.sin(damped * t))
    return point(t, x)
  })
  return `M${points.join(" L")}`
}

function Curve({ path }: { path: string }) {
  return (
    <svg viewBox={`-8 -24 ${SIZE + 16} ${SIZE + 48}`} className="motion-curve" aria-hidden>
      <path d={`M${point(0, 0)} L${point(1, 1)}`} className="motion-curve-guide" />
      <path d={path} className="motion-curve-line" />
    </svg>
  )
}

const bezierPath = ([x1, y1, x2, y2]: Bezier) => `M${point(0, 0)} C${point(x1, y1)} ${point(x2, y2)} ${point(1, 1)}`

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

/** A phone tab bar condensing on demand: transform and opacity only, so nothing re-lays out. */
function CondenseDemo() {
  const [condensed, setCondensed] = useState(false)
  return (
    <div className="motion-condense">
      <TabBar.Root aria-label="Sample navigation" condensed={condensed}>
        <TabBar.Item icon={<IconAi />} label="Assistant" />
        <TabBar.Item icon={<IconEndpoint />} label="Devices" active />
        <TabBar.Item icon={<IconTerminal />} label="Sessions" />
      </TabBar.Root>
      <Switch checked={condensed} onCheckedChange={setCondensed} label="Condensed" />
    </div>
  )
}

const RANGES = [
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
]
const VIEWS = [
  { value: "summary", label: "Summary" },
  { value: "events", label: "Events" },
  { value: "sessions", label: "Sessions" },
  { value: "files", label: "Files" },
]

export default function MotionSection() {
  return (
    <SectionPage>
      <Specimen title="Curves" description="Tweens for state changes, damped springs for physical motion. Durations: instant 80, fast 140, base 200, slow 300, slower 450; glide 420, materialise 340, release 360 ms — all × --motion-scale." wide>
        {TWEENS.map(([token, points, use]) => (
          <figure key={token} className="motion-curve-cell">
            <Curve path={bezierPath(points)} />
            <code className="type-caption">{token}</code>
            <span className="type-caption text-fg-muted">{use}</span>
          </figure>
        ))}
        {SPRINGS.map(([token, zeta, settle, use]) => (
          <figure key={token} className="motion-curve-cell">
            <Curve path={springPath(zeta, settle)} />
            <code className="type-caption">{token}</code>
            <span className="type-caption text-fg-muted">
              {use} · ζ {zeta}
            </span>
          </figure>
        ))}
      </Specimen>
      <Specimen title="Glide" description="A selection indicator travels by its two edges: the leading edge springs ahead, the trailing edge follows, so it stretches between items and gathers on arrival.">
        <Segmented options={VIEWS} defaultValue="summary" aria-label="Device view" />
        <Tabs.Root defaultValue="24h">
          <Tabs.List items={RANGES} aria-label="Chart range" />
        </Tabs.Root>
      </Specimen>
      <Specimen title="Materialise" description="Overlays emerge from their anchor on the materialise spring, shorter along the axis that points away from the trigger; exits are quicker and accelerate away.">
        <PopupDemo />
        <Tooltip content="Opens a remote session">
          <Button variant="secondary">Tooltip</Button>
        </Tooltip>
      </Specimen>
      <Specimen title="Press and confirm" description="A press gives under the pointer and springs back a fraction past rest. A switch's bead stretches into a droplet while held. A completed action draws its tick on the spring curve.">
        <Button variant="primary">Press me</Button>
        <Switch defaultChecked label="Remote control" />
        <ActionButton onAction={() => new Promise((resolve) => setTimeout(resolve, 900))} pendingLabel="Saving…" successLabel="Saved">
          Save changes
        </ActionButton>
      </Specimen>
      <Specimen title="Move without layout" description="Travelling things move with transform, so nothing around them is laid out again: slider ranges and thumbs, the snap preview, a condensing tab bar. Shell panes slide over the workspace and commit their column once." layout="stack">
        <div className="motion-disclosure">
          <Slider defaultValue={[20, 60]} step={10} marks thumbLabels={["From", "To"]} />
        </div>
        <CondenseDemo />
      </Specimen>
      <Specimen title="Disclosure" description="Panels open on their measured height, the one sanctioned height animation, with the content fading in.">
        <div className="motion-disclosure">
          <Accordion.Root>
            <Accordion.Item value="schedule" title="Maintenance window" meta="Sundays">
              Updates install between 02:00 and 04:00 local time. Devices that are offline retry at the next check-in.
            </Accordion.Item>
            <Accordion.Item value="retention" title="Log retention" meta="30 days">
              Session logs are kept for 30 days, then removed.
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </Specimen>
      <Specimen title="Live change and loading" description="A live update flashes the value once. Skeletons sweep in one beat on the compositor." layout="stack">
        <FlashDemo />
        <div className="flex flex-col gap-2">
          <Skeleton.Text type="subtitle" width="40%" />
          <Skeleton.Text type="body" lines={2} width="65%" />
        </div>
      </Specimen>
      <Rules
        do={[
          "Animate to explain where something came from or went.",
          "Use the motion vocabulary: springs for physical motion, tweens for state.",
          "Check every screen with Motion set to Still: nothing moves, nothing waits.",
        ]}
        dont={[
          "Loop animations other than spinners and skeletons.",
          "Depend on an animation finishing for anything to work.",
          "Animate layout (width, height, top, grid tracks) except a disclosure's height: move with transform, or lay out once and animate the transform from where it was.",
        ]}
      />
      <TokenTable
        tokens={[
          ["--motion-scale", "Multiplies every duration"],
          ["--duration-base", "Overlays, most transitions"],
          ["--duration-fast", "State changes, exits"],
          ["--duration-glide", "Selection indicators"],
          ["--duration-materialise", "Overlays emerging"],
          ["--duration-release", "A press springing back"],
          ["--ease-glide", "Indicator spring"],
          ["--ease-materialise", "Overlay spring"],
          ["--press-scale", "Press feedback"],
          ["--overlay-enter-scale", "Overlay start scale"],
          ["--overlay-enter-squash", "Overlay start, away from the anchor"],
          ["--overlay-enter-shift", "Overlay rise"],
        ]}
      />
    </SectionPage>
  )
}
