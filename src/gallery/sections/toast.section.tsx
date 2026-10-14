import { Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Button } from "../../ui/button/index.js"
import { Toaster, ToastPreview, toast } from "../../ui/toast/index.js"

let counter = 0

export default function ToastSection() {
  return (
    <SectionPage>
      <Toaster />
      <Specimen
        title="Live"
        description="Bottom-right on desktop, top on phones. Hover or focus the stack to fan it out and pause the timers; F6 jumps into it from anywhere. Swipe right or down to dismiss."
      >
        <Example label="Tones">
          <Button onClick={() => toast.success("NST-C106 restarted", { description: "Back online after 48 s." })}>Success</Button>
          <Button onClick={() => toast.info("Google Chrome 129.0 deployment started", { description: "Installing on 12 endpoints in Northstar Studio." })}>
            Info
          </Button>
          <Button onClick={() => toast.warning("LMN-4E5E went offline", { description: "Last seen 2 min ago." })}>Warning</Button>
          <Button onClick={() => toast.danger("Restart failed", { description: "Agent offline — retry when NST-C106 reconnects." })}>Danger</Button>
        </Example>
        <Example label="With one action">
          <Button
            onClick={() =>
              toast.success("STUDIO-VM moved to Orbit Workspace", {
                action: { label: "Undo", onClick: () => toast.info("STUDIO-VM moved back to Northstar Studio") },
              })
            }
          >
            Move with Undo
          </Button>
          <Button
            onClick={() =>
              toast.info("Patch report ready", {
                description: "Q3 · 1,284 endpoints",
                action: { label: "View", onClick: () => undefined },
              })
            }
          >
            Report with View
          </Button>
        </Example>
        <Example label="Stacking (at most three visible)">
          <Button
            onClick={() => {
              for (const name of ["NST-C106", "LMN-4E5E", "STUDIO-VM", "CDV-6231"]) {
                counter += 1
                toast.success(`${name} restarted`, { description: `Back online after ${30 + counter} s.` })
              }
            }}
          >
            Restart four endpoints
          </Button>
          <Button variant="ghost" onClick={() => toast.dismiss()}>
            Dismiss all
          </Button>
        </Example>
      </Specimen>

      <Specimen title="Tones" description="Neutral glass with the tone in the tile only. The title names the target and the outcome; the description gives the detail or the reason.">
        <div className="flex w-full flex-col items-start gap-3">
          <ToastPreview tone="success" title="NST-C106 restarted" description="Back online after 48 s." />
          <ToastPreview tone="info" title="Google Chrome 129.0 deployment started" description="Installing on 12 endpoints in Northstar Studio." />
          <ToastPreview tone="warning" title="LMN-4E5E went offline" description="Last seen 2 min ago." />
          <ToastPreview tone="danger" title="Restart failed" description="Agent offline — retry when NST-C106 reconnects." />
          <ToastPreview tone="success" title="STUDIO-VM moved to Orbit Workspace" action="Undo" />
        </div>
      </Specimen>

      <Specimen title="Over imagery" backdrop>
        <div className="flex w-full flex-col items-start gap-3">
          <ToastPreview tone="success" title="NST-C106 restarted" description="Back online after 48 s." />
          <ToastPreview tone="danger" title="Restart failed" description="Agent offline — retry when NST-C106 reconnects." />
        </div>
      </Specimen>

      <Rules
        do={[
          "Name the target and the outcome: “NST-C106 restarted”.",
          "Put the reason for a failure in the description, with what to do next.",
          "Offer Undo instead of a confirmation when an action is easy to reverse.",
          "Call toast() from anywhere — loaders, mutations, plain functions.",
        ]}
        dont={[
          "Toast the outcome of a header button; the button confirms it in place.",
          "Use a toast for state that lasts — that belongs in the window's status bar.",
          "Put more than one action in a toast.",
          "Write “Success!” or “Something went wrong”.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--glass-fill-overlay", "Toast fill"],
          ["--radius-overlay", "Corners"],
          ["--tile-icon-box", "Tone tile"],
          ["--success-soft", "Success tile"],
          ["--danger-soft", "Danger tile"],
          ["--shadow-3", "Elevation"],
          ["--z-toast", "Stacking"],
          ["--duration-slower", "Stack movement"],
        ]}
      />
    </SectionPage>
  )
}
