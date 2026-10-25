import type { ReactNode } from "react"
import { ContainerLab, Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import {
  IconCopy,
  IconFullscreen,
  IconKeyboard,
  IconRefresh,
  IconRemoteControl,
  IconSettings,
  IconWake,
} from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { Tooltip, TooltipPreview } from "../../ui/tooltip/index.js"
import { TruncatedText } from "../../ui/truncated-text/index.js"

const TOOLBAR = [
  { label: "Remote control", icon: <IconRemoteControl />, shortcut: "mod+shift+c" },
  { label: "Send Ctrl+Alt+Del", icon: <IconKeyboard /> },
  { label: "Copy clipboard to endpoint", icon: <IconCopy /> },
  { label: "Full screen", icon: <IconFullscreen />, shortcut: "f11" },
  { label: "Session settings", icon: <IconSettings /> },
]

export default function TooltipSection() {
  return (
    <SectionPage>
      <Specimen
        title="Live"
        description="Hover or focus a button. The first tooltip waits 500ms; moving along the toolbar shows the next one at once. Tooltips are an inverted island: dark on a light page, light on a dark one."
      >
        <Example label="Toolbar (grouped, instant after the first)">
          <div
            className="glass-control flex gap-1 rounded-control p-1"
            role="toolbar"
            aria-label="Remote session"
          >
            {TOOLBAR.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                icon={item.icon}
                aria-label={item.label}
                shortcut={item.shortcut}
              />
            ))}
          </div>
        </Example>
        <Example label="Sides">
          {(["top", "right", "bottom", "left", "inline-start", "inline-end"] as const).map((side) => (
            <Tooltip key={side} content="Last check-in 2 min ago" side={side}>
              <Button size="sm" variant="ghost">
                {side}
              </Button>
            </Tooltip>
          ))}
        </Example>
        <Example label="Disabled — the tooltip gives the reason">
          <Button size="sm" icon={<IconWake />} disabledReason="Endpoint is online">
            Wake on LAN
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<IconRefresh />}
            aria-label="Refresh inventory"
            disabledReason="Inventory refreshes every 15 min"
          />
        </Example>
      </Specimen>

      <Specimen
        title="Anatomy"
        description="One line of medium caption text, an 8px gap and a small arrow. A shortcut follows in keycaps."
      >
        <Example label="Label">
          <TooltipPreview content="View and control the remote device" />
        </Example>
        <Example label="With shortcut">
          <TooltipPreview content="Search" shortcut="mod+k" />
        </Example>
        <Example label="Disabled reason">
          <TooltipPreview content="Endpoint is online" side="bottom" />
        </Example>
      </Specimen>

      <Specimen
        title="Over imagery"
        description="The bubble is glass-overlay in the opposite mode, so it holds contrast over busy content."
        backdrop
      >
        <TooltipPreview content="Connected · 1920 × 1080 · 28 ms" />
        <TooltipPreview content="Open in a new window" shortcut="mod+enter" />
      </Specimen>

      <Specimen
        title="Truncated text"
        description="Single-line labels end in an ellipsis. Hover them: only the ones that were actually cut show a tooltip with the full text."
        layout="grid"
      >
        <TruncateBox label="End (fits)">
          <TruncatedText>NST-C106</TruncatedText>
        </TruncateBox>
        <TruncateBox label="End (cut)">
          <TruncatedText>
            HP EliteOne 1000 G2 27-in 4K UHD AiO · Windows 11 Business 10.0.26300
          </TruncatedText>
        </TruncateBox>
        <TruncateBox label="Middle: hostname">
          <TruncatedText middle>NST-ADMINISTRATION-SERVER-C106</TruncatedText>
        </TruncateBox>
        <TruncateBox label="Middle: account">
          <TruncatedText middle>AzureAD\MiraRowan-Administrator</TruncatedText>
        </TruncateBox>
      </Specimen>

      <ContainerLab description="TruncatedText in each box: names end in an ellipsis, identifiers keep both ends. Nothing is clipped without one.">
        {() => (
          <div className="flex h-full flex-col justify-center gap-1 p-2">
            <TruncatedText className="type-label">
              Cedar Vale Collective
            </TruncatedText>
            <TruncatedText middle className="type-caption text-fg-muted">
              CDV-6231-RECEPTION-KIOSK
            </TruncatedText>
          </div>
        )}
      </ContainerLab>

      <Rules
        do={[
          "Give every icon-only control a tooltip that repeats its aria-label.",
          "Use a tooltip to say why a control is disabled, and keep that control focusable.",
          "Show the shortcut in the tooltip when the action has one.",
          "Truncate single-line labels with TruncatedText so the full text is one hover away.",
          "Truncate identifiers in the middle so both ends stay readable.",
        ]}
        dont={[
          "Put links, buttons or anything interactive in a tooltip — use a Popover.",
          "Write more than one line; a tooltip is a label, not help text.",
          "Use a tooltip as the only place important information lives.",
          "Show a tooltip that repeats text which is already fully visible.",
          "Clip text with overflow hidden and no ellipsis.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--glass-fill-overlay", "Bubble fill (in the inverted mode)"],
          ["--radius-item", "Corner radius"],
          ["--shadow-2", "Elevation"],
          ["--type-caption-size", "Text size"],
          ["--z-tooltip", "Stacking: above every other layer"],
          ["--duration-fast", "Enter and exit"],
          ["--overlay-enter-scale", "Enter scale"],
        ]}
      />
    </SectionPage>
  )
}

function TruncateBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="gallery-example">
      <div className="glass-inset flex h-10 max-w-3xs items-center rounded-control px-3">
        {children}
      </div>
      <figcaption className="gallery-example-label">{label}</figcaption>
    </figure>
  )
}
