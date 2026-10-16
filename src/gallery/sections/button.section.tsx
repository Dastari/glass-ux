import { useState } from "react"
import { Example, Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import {
  IconChevronDown,
  IconEndpoint,
  IconMoreHorizontal,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSparkle,
} from "../../icons/generated/icons.js"
import { ActionButton, Button, ButtonGroup, type ButtonStatus, type ButtonVariant } from "../../ui/button/index.js"

const VARIANTS: ButtonVariant[] = [
  "primary",
  "secondary",
  "ghost",
  "soft",
  "danger",
  "danger-soft",
  "success",
  "success-soft",
  "warning",
  "warning-soft",
]

const LABELS: Partial<Record<ButtonVariant, [string, string]>> = {
  danger: ["Remove", "Remove device"],
  "danger-soft": ["Remove", "Remove device"],
  success: ["Approve", "Approve enrolment"],
  "success-soft": ["Approve", "Approve enrolment"],
  warning: ["Restart", "Restart now"],
  "warning-soft": ["Restart", "Restart now"],
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function ButtonSection() {
  const [fail, setFail] = useState(false)
  return (
    <SectionPage>
      <Specimen title="Variants" description="One primary per view. Secondary for supporting actions, ghost for toolbars, soft for toggled-on. Tones carry meaning: success approves or brings online, warning has consequences short of destruction, danger confirms destruction. Icon-only buttons show their label as a tooltip." wide>
        <Matrix
          columns={["Default", "With icon", "Icon only", "Disabled"]}
          rows={VARIANTS.map((variant) => ({
            label: variant,
            cells: [
              <Button key="a" variant={variant}>
                {LABELS[variant]?.[0] ?? "Connect"}
              </Button>,
              <Button key="b" variant={variant} icon={<IconEndpoint />}>
                {LABELS[variant]?.[1] ?? "Remote control"}
              </Button>,
              <Button key="c" variant={variant} icon={<IconSettings />} aria-label="Settings" />,
              <Button key="d" variant={variant} disabledReason="NST-C106 is offline">
                Unavailable
              </Button>,
            ],
          }))}
        />
      </Specimen>

      <Specimen title="Sizes" description="sm 32 · md 40 · lg 48. Compact density and touch screens adjust the heights through tokens, never per screen.">
        {(["sm", "md", "lg"] as const).map((size) => (
          <Example key={size} label={size}>
            <Button size={size} variant="primary" icon={<IconPlus />}>
              New ticket
            </Button>
            <Button size={size} icon={<IconSearch />}>
              Search
            </Button>
            <Button size={size} variant="ghost" icon={<IconMoreHorizontal />} aria-label="More actions" />
          </Example>
        ))}
      </Specimen>

      <Specimen title="Feedback in place" description="The button confirms its own outcome. Faces share one grid cell, so “Save changes”, “Saving…” and “Saved” never move the layout. Errors also raise a toast with the reason.">
        <Example label="Click to run (succeeds after 1.2s)">
          <ActionButton variant="primary" onAction={() => wait(1200)} pendingLabel="Saving…" successLabel="Saved">
            Save changes
          </ActionButton>
          <ActionButton
            onAction={() => wait(900).then(() => (fail ? Promise.reject(new Error("Agent offline")) : undefined))}
            pendingLabel="Restarting…"
            successLabel="Restarted"
            errorLabel="Failed"
          >
            Restart agent
          </ActionButton>
          <Button variant="ghost" size="sm" onClick={() => setFail((value) => !value)}>
            {fail ? "Second button will fail" : "Second button will succeed"}
          </Button>
        </Example>
        <Example label="Every status, frozen">
          {(["idle", "pending", "success", "error"] as ButtonStatus[]).map((status) => (
            <Button key={status} variant="primary" status={status} pendingLabel="Saving…" successLabel="Saved" errorLabel="Failed">
              Save changes
            </Button>
          ))}
        </Example>
        <Example label="Secondary">
          {(["idle", "pending", "success", "error"] as ButtonStatus[]).map((status) => (
            <Button key={status} status={status} icon={<IconSparkle />} pendingLabel="Deploying…" successLabel="Deployed" errorLabel="Failed">
              Deploy
            </Button>
          ))}
        </Example>
      </Specimen>

      <Specimen title="Groups and split buttons" description="Adjacent actions sit 8px apart. A split button joins the main action to its menu.">
        <Example label="Split primary">
          <ButtonGroup attached>
            <Button variant="primary" icon={<IconEndpoint />}>
              Connect
            </Button>
            <Button variant="primary" icon={<IconChevronDown />} aria-label="Connection options" />
          </ButtonGroup>
        </Example>
        <Example label="Header actions">
          <ButtonGroup className="max-w-full flex-wrap">
            <Button variant="ghost" icon={<IconMoreHorizontal />} aria-label="More" />
            <Button iconEnd={<IconChevronDown />}>More actions</Button>
            <Button variant="primary" icon={<IconEndpoint />}>
              Connect
            </Button>
          </ButtonGroup>
        </Example>
        <Example label="Circle (composer send)">
          <Button variant="primary" shape="circle" size="lg" icon={<IconSparkle />} aria-label="Ask Assistant" />
          <Button shape="circle" icon={<IconSearch />} aria-label="Search" />
        </Example>
      </Specimen>

      <Specimen title="Over glass and imagery" description="Buttons keep their contrast on top of busy content." backdrop>
        <Button variant="primary" icon={<IconEndpoint />}>
          Connect
        </Button>
        <Button icon={<IconSettings />}>Settings</Button>
        <Button variant="soft">Selected</Button>
        <Button variant="ghost" icon={<IconMoreHorizontal />} aria-label="More" />
      </Specimen>

      <Rules
        do={[
          "Use exactly one primary button per view or dialog.",
          "Put the primary action last (right-most) in a footer or header.",
          "Give async actions a status so the button itself confirms the outcome.",
          "Label with a verb: “Save changes”, “Restart agent”, “Connect”.",
          "Give every icon-only button an aria-label (a tooltip shows the same text).",
        ]}
        dont={[
          "Style a link or div to look like a button — render Button with `render` instead.",
          "Use solid danger as an entry point; it confirms inside a dialog only.",
          "Add a spinner beside a button or swap it for a different element while saving.",
          "Pass a size to icons inside a button; the button sizes them.",
          "Disable a button without explaining why nearby (hint text or tooltip).",
        ]}
      />

      <TokenTable
        tokens={[
          ["--control-h-md", "Default height"],
          ["--control-px-md", "Horizontal padding"],
          ["--radius-control", "Corner radius"],
          ["--accent", "Primary fill (start)"],
          ["--accent-2", "Primary fill (end)"],
          ["--shadow-accent", "Primary glow"],
          ["--glass-fill-control", "Secondary fill"],
          ["--glass-edge", "Secondary edge"],
          ["--press-scale", "Press feedback"],
          ["--feedback-hold", "How long ✓ / ✕ stays"],
          ["--duration-fast", "State transitions"],
        ]}
      />
    </SectionPage>
  )
}
