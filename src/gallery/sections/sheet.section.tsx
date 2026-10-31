import { useState, type ReactNode } from "react"
import { Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import {
  IconAutomation,
  IconEndpoint,
  IconGrid,
  IconOrganisation,
  IconPower,
  IconReporting,
  IconRemoteControl,
  IconRestart,
  IconSettings,
  IconSoftware,
  IconTerminal,
  IconTickets,
} from "../../icons/generated/icons.js"
import { StatusBadge, type StatusKind } from "../../ui/badge/index.js"
import { Button } from "../../ui/button/index.js"
import { Dialog } from "../../ui/dialog/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { Sheet, type SheetSide, type SheetSize, type SheetSnapPoint } from "../../ui/sheet/index.js"
import { TruncatedText } from "../../ui/truncated-text/index.js"

const DETAILS: Array<[label: string, value: string]> = [
  ["Manufacturer", "HP"],
  ["Model", "EliteOne 1000 G2 27-in 4K UHD AiO"],
  ["Serial number", "8CC0481GWV"],
  ["Operating system", "Windows 11 Business 10.0.26300"],
  ["Processor", "Intel(R) Core(TM) i5-8500T @ 2.10GHz"],
  ["Physical memory", "7.8 GB"],
  ["Uptime", "2 days"],
  ["Domain", "WORKGROUP"],
  ["Signed in", "AzureAD\\MiraRowan"],
  ["Agent", "6.8.0 · checked in 1 min ago"],
  ["Last reboot", "11 Oct 2026, 7:42 am"],
  ["Public IP", "203.0.113.48"],
  ["Local IP", "10.20.30.106"],
  ["MAC address", "3C:52:82:4A:9F:11"],
]

function Details() {
  return (
    <dl className="flex flex-col gap-3">
      {DETAILS.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col">
          <dt className="type-caption text-fg-muted">{label}</dt>
          <dd className="min-w-0">
            <TruncatedText>{value}</TruncatedText>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function InspectorContent({ footer }: { footer?: ReactNode }) {
  return (
    <>
      <Sheet.Header icon={<IconEndpoint />} title="NST-C106" subtitle="HP EliteOne 1000 G2 · Windows 11 Business">
        <StatusBadge status="online" />
      </Sheet.Header>
      <Sheet.Body>
        <Details />
      </Sheet.Body>
      {footer}
    </>
  )
}

function SheetDemo({ size, label, side }: { size: SheetSize; label: string; side?: SheetSide }) {
  return (
    <Sheet.Root side={side}>
      <Sheet.Trigger render={<Button>{label}</Button>} />
      <Sheet.Popup size={size}>
        <InspectorContent
          footer={
            <Sheet.Footer>
              <Sheet.Close render={<Button>Close</Button>} />
              <Button variant="primary" icon={<IconRemoteControl />}>
                Connect
              </Button>
            </Sheet.Footer>
          }
        />
      </Sheet.Popup>
    </Sheet.Root>
  )
}

const NAVIGATION: Array<{ label: string; icon: ReactNode; count?: number }> = [
  { label: "All endpoints", icon: <IconGrid />, count: 1284 },
  { label: "Northstar Studio", icon: <IconOrganisation />, count: 3 },
  { label: "Cedar Vale Collective", icon: <IconOrganisation />, count: 2 },
  { label: "Orbit Workspace", icon: <IconOrganisation />, count: 3 },
]

/** Left: the section drawer on tablets and phones (R6.8). */
function LeftSheetDemo() {
  return (
    <Sheet.Root side="left">
      <Sheet.Trigger render={<Button>Left · section drawer</Button>} />
      <Sheet.Popup size="sm">
        <Sheet.Header icon={<IconEndpoint />} title="Endpoints" />
        <Sheet.Body>
          <ul className="flex flex-col gap-0.5">
            {NAVIGATION.map((item, index) => (
              <li key={item.label}>
                <Sheet.Close
                  render={
                    <button type="button" className="fa-item w-full text-start" aria-current={index === 0 ? "page" : undefined}>
                      {item.icon}
                      <span className="fa-item-label">{item.label}</span>
                      {item.count !== undefined ? <span className="fa-item-trail">{item.count.toLocaleString("en-AU")}</span> : null}
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        </Sheet.Body>
      </Sheet.Popup>
    </Sheet.Root>
  )
}

const MORE: Array<{ label: string; icon: ReactNode }> = [
  { label: "Organisations", icon: <IconOrganisation /> },
  { label: "Software", icon: <IconSoftware /> },
  { label: "Automation", icon: <IconAutomation /> },
  { label: "Reporting", icon: <IconReporting /> },
  { label: "Tickets", icon: <IconTickets /> },
  { label: "Settings", icon: <IconSettings /> },
]

/** Bottom: a short list of choices with a grab handle (the phone tab bar's More). */
function BottomSheetDemo() {
  return (
    <Sheet.Root side="bottom">
      <Sheet.Trigger render={<Button>Bottom · More</Button>} />
      <Sheet.Popup size="sm">
        <Sheet.Header title="More" />
        <Sheet.Body>
          <ul className="flex flex-col gap-0.5">
            {MORE.map((item) => (
              <li key={item.label}>
                <Sheet.Close
                  render={
                    <button type="button" className="fa-item w-full text-start">
                      {item.icon}
                      <span className="fa-item-label">{item.label}</span>
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        </Sheet.Body>
      </Sheet.Popup>
    </Sheet.Root>
  )
}

const FLEET: Array<{ name: string; model: string; status: StatusKind }> = [
  { name: "NST-C106", model: "HP EliteOne 1000 G2", status: "online" },
  { name: "NST-L214", model: "Lenovo ThinkPad T14 Gen 4", status: "warning" },
  { name: "NST-D031", model: "Dell OptiPlex 7010", status: "online" },
  { name: "NST-L118", model: "Lenovo ThinkPad X1 Carbon", status: "offline" },
  { name: "NST-M007", model: "Apple Mac mini M2", status: "online" },
  { name: "NST-C122", model: "HP EliteOne 800 G6", status: "maintenance" },
  { name: "NST-L230", model: "Dell Latitude 5440", status: "online" },
  { name: "NST-D044", model: "Dell OptiPlex 3000", status: "error" },
  { name: "NST-L301", model: "Lenovo ThinkPad E14", status: "online" },
  { name: "NST-M012", model: "Apple MacBook Air M3", status: "online" },
  { name: "NST-C140", model: "HP ProDesk 400 G9", status: "installing" },
  { name: "NST-L305", model: "Lenovo ThinkPad L13", status: "online" },
]

function FleetList() {
  return (
    <ul className="flex flex-col gap-0.5">
      {FLEET.map((endpoint) => (
        <li key={endpoint.name}>
          <button type="button" className="fa-item w-full text-start">
            <IconEndpoint />
            <span className="fa-item-label">
              {endpoint.name}
              <span className="text-fg-muted"> · {endpoint.model}</span>
            </span>
            <span className="fa-item-trail">
              <StatusBadge status={endpoint.status} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

const SNAP_POINTS: SheetSnapPoint[] = ["9.5rem", 0.5, 1] // tokens:allow snap points are the heights the sheet rests at
const SNAP_LABELS = ["Peek", "Half", "Full"]

function FleetSheetContent() {
  return (
    <>
      <Sheet.Header icon={<IconOrganisation />} title="Northstar Studio" subtitle="12 endpoints · 3 need attention" />
      <Sheet.Body>
        <FleetList />
      </Sheet.Body>
    </>
  )
}

/** A bottom sheet that rests at a peek, half or the full height. */
function SnapSheetDemo() {
  return (
    <Sheet.Root side="bottom" snapPoints={SNAP_POINTS} snapPointLabels={SNAP_LABELS}>
      <Sheet.Trigger render={<Button>Peek · half · full</Button>} />
      <Sheet.Popup size="md">
        <FleetSheetContent />
      </Sheet.Popup>
    </Sheet.Root>
  )
}

/** The snap point held by the page: the segmented control and the sheet move together. */
function ControlledSnapDemo() {
  const [open, setOpen] = useState(false)
  const [point, setPoint] = useState<SheetSnapPoint | null>(SNAP_POINTS[1]!)
  const value = SNAP_LABELS[SNAP_POINTS.indexOf(point ?? SNAP_POINTS[1]!)]!
  return (
    <>
      <Button onClick={() => setOpen((current) => !current)} aria-pressed={open}>
        Fleet sheet
      </Button>
      <Segmented
        aria-label="Sheet height"
        options={SNAP_LABELS.map((label) => ({ value: label, label }))}
        value={value}
        onValueChange={(label) => {
          setPoint(SNAP_POINTS[SNAP_LABELS.indexOf(label)]!)
          setOpen(true)
        }}
      />
      <Sheet.Root
        side="bottom"
        modal={false}
        open={open}
        onOpenChange={setOpen}
        snapPoints={SNAP_POINTS}
        snapPointLabels={SNAP_LABELS}
        snapPoint={point}
        onSnapPointChange={(next) => {
          if (next !== null) setPoint(next)
        }}
      >
        <Sheet.Popup size="md" initialFocus={false}>
          <FleetSheetContent />
        </Sheet.Popup>
      </Sheet.Root>
    </>
  )
}

/** A non-modal inspector that follows the selected row; the list stays usable. */
function NonModalDemo() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(FLEET[0]!)
  return (
    <>
      <ul className="flex w-full max-w-sm flex-col gap-0.5" aria-label="Endpoints">
        {FLEET.slice(0, 4).map((endpoint) => (
          <li key={endpoint.name}>
            <button
              type="button"
              className="fa-item w-full text-start"
              aria-pressed={open && selected.name === endpoint.name}
              data-selected={open && selected.name === endpoint.name ? "" : undefined}
              onClick={() => {
                setSelected(endpoint)
                setOpen(true)
              }}
            >
              <IconEndpoint />
              <span className="fa-item-label">{endpoint.name}</span>
              <span className="fa-item-trail">
                <StatusBadge status={endpoint.status} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Sheet.Root modal={false} open={open} onOpenChange={setOpen}>
        <Sheet.Popup size="sm" initialFocus={false}>
          <Sheet.Header icon={<IconEndpoint />} title={selected.name} subtitle={selected.model}>
            <StatusBadge status={selected.status} />
          </Sheet.Header>
          <Sheet.Body>
            <dl className="flex flex-col gap-3">
              {[
                ["Model", selected.model],
                ["Organisation", "Northstar Studio"],
                ["Agent", "6.8.0"],
              ].map(([label, value]) => (
                <div key={label} className="flex min-w-0 flex-col">
                  <dt className="type-caption text-fg-muted">{label}</dt>
                  <dd className="min-w-0">
                    <TruncatedText>{value}</TruncatedText>
                  </dd>
                </div>
              ))}
            </dl>
          </Sheet.Body>
        </Sheet.Popup>
      </Sheet.Root>
    </>
  )
}

const ORGANISATIONS = ["Northstar Studio", "Cedar Vale Collective", "Orbit Workspace", "Harbour Lane Design"]

/** A side sheet that opens a second one; the first recedes behind it. */
function NestedSideDemo() {
  const [organisation, setOrganisation] = useState(ORGANISATIONS[0]!)
  return (
    <Sheet.Root>
      <Sheet.Trigger render={<Button>Side · move endpoint</Button>} />
      <Sheet.Popup size="md">
        <Sheet.Header icon={<IconEndpoint />} title="NST-C106" subtitle={organisation}>
          <StatusBadge status="online" />
        </Sheet.Header>
        <Sheet.Body>
          <Details />
        </Sheet.Body>
        <Sheet.Footer>
          <Sheet.Root>
            <Sheet.Trigger render={<Button icon={<IconOrganisation />}>Move…</Button>} />
            <Sheet.Popup size="sm">
              <Sheet.Header title="Move to organisation" subtitle="NST-C106" />
              <Sheet.Body>
                <ul className="flex flex-col gap-0.5">
                  {ORGANISATIONS.map((name) => (
                    <li key={name}>
                      <Sheet.Close
                        render={
                          <button
                            type="button"
                            className="fa-item w-full text-start"
                            aria-current={name === organisation ? "true" : undefined}
                            data-selected={name === organisation ? "" : undefined}
                            onClick={() => setOrganisation(name)}
                          >
                            <IconOrganisation />
                            <span className="fa-item-label">{name}</span>
                          </button>
                        }
                      />
                    </li>
                  ))}
                </ul>
              </Sheet.Body>
            </Sheet.Popup>
          </Sheet.Root>
          <Sheet.Close render={<Button>Close</Button>} />
        </Sheet.Footer>
      </Sheet.Popup>
    </Sheet.Root>
  )
}

const SCRIPTS = ["Clear print queue", "Flush DNS cache", "Collect diagnostics", "Reset Windows Update"]

/** A bottom sheet of actions whose "Run script" opens a second bottom sheet. */
function NestedBottomDemo() {
  return (
    <Sheet.Root side="bottom">
      <Sheet.Trigger render={<Button>Bottom · actions</Button>} />
      <Sheet.Popup size="sm">
        <Sheet.Header title="NST-C106" subtitle="HP EliteOne 1000 G2" />
        <Sheet.Body>
          <ul className="flex flex-col gap-0.5">
            <li>
              <Sheet.Close
                render={
                  <button type="button" className="fa-item w-full text-start">
                    <IconRestart />
                    <span className="fa-item-label">Restart</span>
                  </button>
                }
              />
            </li>
            <li>
              <Sheet.Close
                render={
                  <button type="button" className="fa-item w-full text-start">
                    <IconPower />
                    <span className="fa-item-label">Shut down</span>
                  </button>
                }
              />
            </li>
            <li>
              <Sheet.Root side="bottom">
                <Sheet.Trigger
                  render={
                    <button type="button" className="fa-item w-full text-start">
                      <IconTerminal />
                      <span className="fa-item-label">Run script…</span>
                    </button>
                  }
                />
                <Sheet.Popup size="sm">
                  <Sheet.Header title="Run script" subtitle="NST-C106" />
                  <Sheet.Body>
                    <ul className="flex flex-col gap-0.5">
                      {SCRIPTS.map((name) => (
                        <li key={name}>
                          <Sheet.Close
                            render={
                              <button type="button" className="fa-item w-full text-start">
                                <IconTerminal />
                                <span className="fa-item-label">{name}</span>
                              </button>
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </Sheet.Body>
                </Sheet.Popup>
              </Sheet.Root>
            </li>
          </ul>
        </Sheet.Body>
      </Sheet.Popup>
    </Sheet.Root>
  )
}

export default function SheetSection() {
  return (
    <SectionPage>
      <Specimen
        title="Live"
        description="Slides in from its edge; Esc, the scrim or a swipe back toward that edge closes it and focus returns to the trigger. The body scrolls; header and footer stay."
      >
        <Example label="Sides">
          <SheetDemo size="md" label="Right · inspector" side="right" />
          <SheetDemo size="sm" label="Start · navigation" side="start" />
          <SheetDemo size="sm" label="End · inspector" side="end" />
          <LeftSheetDemo />
          <BottomSheetDemo />
        </Example>
        <Example label="Widths">
          <SheetDemo size="sm" label="sm 360" />
          <SheetDemo size="md" label="md 480" />
          <SheetDemo size="lg" label="lg 640" />
        </Example>
      </Specimen>

      <Specimen
        title="Snap points"
        description="A bottom sheet rests at its snap points. Drag the handle or the content to move between them; a fast flick skips a point, and below the lowest it closes. The handle is a slider: arrow keys step, Home and End pick the lowest and highest, a click raises it. Below the highest point the body does not scroll."
      >
        <Example label="Uncontrolled">
          <SnapSheetDemo />
        </Example>
        <Example label="Controlled · non-modal">
          <ControlledSnapDemo />
        </Example>
      </Specimen>

      <Specimen
        title="Non-modal"
        description="modal={false}: no scrim, the page keeps scrolling and taking clicks, Tab continues to the page and a press outside leaves the sheet open. Esc or a swipe closes it."
      >
        <Example label="Inspector that follows the selection">
          <NonModalDemo />
        </Example>
      </Specimen>

      <Specimen
        title="Nested"
        description="A sheet opened from inside a sheet stacks on it. The one behind recedes and dims, takes no input until the front sheet closes, and gets focus back on the control that opened it."
      >
        <Example label="Stacked">
          <NestedSideDemo />
          <NestedBottomDemo />
        </Example>
      </Specimen>

      <Specimen title="Anatomy" description="The same header, scrolling body and footer as a dialog, at the full height of the viewport less the page gutter.">
        <Dialog.Preview size="sm" height="short">
          <InspectorContent
            footer={
              <Dialog.Footer>
                <Button>Close</Button>
                <Button variant="primary" icon={<IconRemoteControl />}>
                  Connect
                </Button>
              </Dialog.Footer>
            }
          />
        </Dialog.Preview>
      </Specimen>

      <Rules
        do={[
          "Use a right sheet for an inspector on screens too narrow to keep it open beside the content.",
          "Use a left sheet only for the section drawer on tablets and phones.",
          "Use a bottom sheet for a short list of choices, such as the tab bar's More.",
          "Give it the same header as the entity it inspects.",
          "Give a bottom sheet snap points when its lowest point is useful on its own, such as a summary over a list or map.",
          "Make a sheet non-modal when the page beside it stays in use, such as an inspector that follows the selected row.",
        ]}
        dont={[
          "Use a sheet for a task with a single outcome — that is a dialog.",
          "Open a sheet from inside a dialog.",
          "Stack more than two sheets; open a window instead.",
          "Put L1 destinations in a left sheet; they belong to the rail or the tab bar.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--radius-dialog", "Pane corners"],
          ["--radius-sheet", "Bottom sheet's top corners"],
          ["--page-gutter", "Distance from the viewport edges"],
          ["--safe-bottom", "Bottom sheet padding above the home indicator"],
          ["--shadow-4", "Elevation"],
          ["--duration-slow", "Slide in"],
          ["--ease-enter", "Slide easing"],
          ["--scrim", "Dim over a sheet that has receded behind another"],
        ]}
      />
    </SectionPage>
  )
}
