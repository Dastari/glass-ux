import { useState, type CSSProperties, type ReactNode } from "react"
import { ContainerLab, Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import {
  IconEndpoint,
  IconFullscreenExit,
  IconKeyboard,
  IconRefresh,
  IconRemoteControl,
  IconTaskManager,
  IconTerminal,
} from "../../icons/generated/icons.js"
import { EntityHeader } from "../../shell/index.js"
import { Button } from "../../ui/button/index.js"
import { Kbd } from "../../ui/kbd/index.js"
import { Menu } from "../../ui/menu/index.js"
import { Toaster, toast } from "../../ui/toast/index.js"
import { Panel, PanelBody } from "../../ui/surface/index.js"
import {
  Dock,
  SNAP_LAYOUTS,
  SNAP_ZONES,
  SNAP_ZONE_LABELS,
  Window,
  WindowFrame,
  WindowManagerProvider,
  Workspace,
  createWindowManager,
  fracVars,
  registerWindowKind,
  useWindow,
  useWindowVisibility,
  type WindowContentProps,
  type WindowStatusTone,
} from "../../windows/index.js"

/* ── Sample bodies ───────────────────────────────────────────────────────── */

const PROCESSES = [
  ["chrome.exe", "6.2%", "1,184 MB"],
  ["OUTLOOK.EXE", "1.4%", "412 MB"],
  ["GlassUxAgent.exe", "0.8%", "96 MB"],
  ["MsMpEng.exe", "3.1%", "238 MB"],
  ["Teams.exe", "2.6%", "688 MB"],
] as const

function ProcessRows() {
  return (
    <ul className="gallery-wm-rows">
      {PROCESSES.map(([name, cpu, memory]) => (
        <li key={name}>
          <span>{name}</span>
          <span data-numeric>{cpu}</span>
          <span data-numeric>{memory}</span>
        </li>
      ))}
    </ul>
  )
}

interface SampleParams {
  /** Endpoint presentation data supplied by the host. */
  endpoint: string
  [key: string]: string
}

function ProcessesBody(_props: WindowContentProps<SampleParams>) {
  const { visible } = useWindowVisibility()
  return (
    <>
      <Window.Actions>
        <Button variant="ghost" size="sm" icon={<IconRefresh />} aria-label="Refresh processes" />
      </Window.Actions>
      <Window.Status indicator={visible ? { tone: "success", label: "Live" } : { tone: "neutral", label: "Paused" }}>
        <Window.StatusItem tone={visible ? "success" : "neutral"}>{visible ? "Live" : "Paused"}</Window.StatusItem>
        <Window.StatusItem>142 processes</Window.StatusItem>
        <Window.StatusMeta>
          <span>CPU 17%</span>
        </Window.StatusMeta>
      </Window.Status>
      <Window.Body>
        <ProcessRows />
      </Window.Body>
    </>
  )
}

function SendKeys({ endpoint }: { endpoint: string }) {
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="ghost" size="sm" icon={<IconKeyboard />} aria-label="Send keys" />} />
      <Menu.Popup>
        {["Ctrl+Alt+Del", "Windows key", "Print Screen"].map((keys) => (
          <Menu.Item key={keys} onClick={() => toast.success(`Sent ${keys} to ${endpoint}`)}>
            {keys}
          </Menu.Item>
        ))}
      </Menu.Popup>
    </Menu.Root>
  )
}

/** A remote screen: its tools sit in the app bar, and float over the screen in full screen. */
function ScreenBody({ params }: WindowContentProps<SampleParams>) {
  const { fullscreen, exitFullscreen } = useWindow()
  return (
    <>
      {fullscreen ? null : (
        <Window.Actions>
          <SendKeys endpoint={params.endpoint} />
        </Window.Actions>
      )}
      <Window.Status indicator={{ tone: "success", label: "Connected" }}>
        <Window.StatusItem tone="success">Connected</Window.StatusItem>
        <Window.StatusItem>1920 × 1080</Window.StatusItem>
        <Window.StatusItem>28 ms</Window.StatusItem>
      </Window.Status>
      <Window.Body variant="fill">
        <div className="gallery-wm-screen" data-mode="dark" role="img" aria-label={`Screen of ${params.endpoint}`} />
        {fullscreen ? (
          <div className="glass-chrome gallery-wm-screen-tools" role="toolbar" aria-label={`Remote control of ${params.endpoint}`}>
            <SendKeys endpoint={params.endpoint} />
            <Button variant="ghost" size="sm" icon={<IconFullscreenExit />} aria-label="Exit full screen" onClick={exitFullscreen} />
          </div>
        ) : null}
      </Window.Body>
    </>
  )
}

function TerminalBody({ params }: WindowContentProps<SampleParams>) {
  return (
    <>
      <Window.Status indicator={{ tone: "success", label: "Connected" }}>
        <Window.StatusItem tone="success">Connected</Window.StatusItem>
        <Window.StatusItem>PowerShell 7.4</Window.StatusItem>
      </Window.Status>
      <Window.Body variant="fill">
        <pre className="gallery-wm-terminal" data-mode="dark" aria-label={`Terminal on ${params.endpoint}`}>
          {"PS C:\\> Get-Service GlassUxAgent\n\nStatus   Name\n------   ----\nRunning  GlassUxAgent"}
        </pre>
      </Window.Body>
    </>
  )
}

registerWindowKind<SampleParams>({
  kind: "gallery.processes",
  title: () => "Task manager",
  subtitle: (params) => params.endpoint,
  icon: IconTaskManager,
  size: { w: 440, h: 300 },
  minSize: { w: 280, h: 180 },
  load: async () => ({ default: ProcessesBody }),
})
registerWindowKind<SampleParams>({
  kind: "gallery.screen",
  title: () => "Remote control",
  subtitle: (params) => params.endpoint,
  icon: IconRemoteControl,
  key: (params) => params.endpoint,
  size: { w: 480, h: 320 },
  minSize: { w: 280, h: 200 },
  load: async () => ({ default: ScreenBody }),
})
registerWindowKind<SampleParams>({
  kind: "gallery.terminal",
  title: () => "Terminal",
  subtitle: (params) => params.endpoint,
  icon: IconTerminal,
  size: { w: 420, h: 260 },
  minSize: { w: 280, h: 180 },
  load: async () => ({ default: TerminalBody }),
})

/* ── Static frames ───────────────────────────────────────────────────────── */

function StaticFrame({
  focused = true,
  state = "floating",
  status = "success",
  statusLabel = "Live",
  meta = true,
  controls = "standard",
  size = "md",
  className,
}: {
  focused?: boolean
  /** Controlled view state, including loading, empty and error states. */
  state?: "tiled" | "floating" | "maximised" | "popout"
  /** Current operation or connection status. */
  status?: WindowStatusTone
  statusLabel?: string
  /** Supporting data displayed with the item. */
  meta?: boolean
  controls?: "standard" | "popout"
  /** Box height: sm (status bar examples), md (states), lg (anatomy). */
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const noop = () => {}
  return (
    <div className="gallery-wm-box" data-size={size}>
      <WindowFrame.Root focused={focused} state={state} className={className} aria-label="Task manager">
        <WindowFrame.AppBar
          icon={<IconTaskManager />}
          title="Task manager"
          subtitle="NST-C106"
          actions={<Button variant="ghost" size="sm" icon={<IconRefresh />} aria-label="Refresh processes" />}
          controls={
            controls === "popout" ? (
              <WindowFrame.Controls title="Task manager" onReturn={noop} onClose={noop} />
            ) : (
              <WindowFrame.Controls
                title="Task manager"
                maximised={state === "maximised"}
                onPopOut={noop}
                onToggleFullscreen={noop}
                onMinimise={noop}
                onToggleMaximise={noop}
                onClose={noop}
              />
            )
          }
        />
        <WindowFrame.Body>
          <ProcessRows />
        </WindowFrame.Body>
        <WindowFrame.StatusBar>
          <WindowFrame.StatusGroup>
            <WindowFrame.StatusItem tone={status}>{statusLabel}</WindowFrame.StatusItem>
            <WindowFrame.StatusItem>142 processes</WindowFrame.StatusItem>
            {meta ? (
              <WindowFrame.StatusMeta>
                <span>CPU 17%</span>
                <span>7.8 GB of 16 GB</span>
              </WindowFrame.StatusMeta>
            ) : null}
          </WindowFrame.StatusGroup>
        </WindowFrame.StatusBar>
      </WindowFrame.Root>
    </div>
  )
}

const ANATOMY: Array<[string, string]> = [
  ["Icon", "The kind's icon in a tile. Dims when another window has focus."],
  ["Title and data subtitle", "What the window is, and the item it is about. Never a description."],
  ["Actions", "Window-specific ghost buttons, put there by the body through Window.Actions."],
  ["Window controls", "Pop out, full screen, minimise, maximise or restore, close. Drag the bar to move; double-click to maximise."],
  ["Body", "A size container. Scroll bodies are padded; fill bodies run edge to edge for viewers."],
  ["Status", "Live state with a dot. The same state lights the window's dock entry."],
  ["Metadata", "Right-aligned facts joined with ·. The first thing to give way when narrow."],
]

/* ── Live workspace ──────────────────────────────────────────────────────── */

function MiniWorkspace() {
  // Its own manager: not saved, not synced, no pop-out.
  const [manager] = useState(() => createWindowManager({ storageKey: null, channelName: null, defaultLayout: () => "floating" }))
  const open = (kind: string) => manager.open({ kind, params: { endpoint: "NST-C106" } })
  return (
    <WindowManagerProvider manager={manager}>
      <Toaster />
      <div className="gallery-wm-mini">
        <Workspace
          primaryLabel="NST-C106"
          primary={
            <>
              <EntityHeader
                icon={<IconEndpoint />}
                title="NST-C106"
                subtitle="HP EliteOne 1000 G2 27-in 4K UHD AiO"
                actions={
                  <>
                    <Button icon={<IconTerminal />} onClick={() => open("gallery.terminal")}>
                      Terminal
                    </Button>
                    <Button icon={<IconTaskManager />} onClick={() => open("gallery.processes")}>
                      Task manager
                    </Button>
                    <Button variant="primary" icon={<IconRemoteControl />} onClick={() => open("gallery.screen")}>
                      Connect
                    </Button>
                  </>
                }
              />
              <WindowFrame.Body>
                <Panel>
                  <PanelBody>
                    <p className="fa-hint">Open windows from the header. Drag a title bar to an edge, a corner or the snap bar.</p>
                  </PanelBody>
                </Panel>
              </WindowFrame.Body>
            </>
          }
        />
      </div>
    </WindowManagerProvider>
  )
}

/** A dock with real entries: one focused, one minimised, one popped out. */
function DockSpecimen() {
  const [manager] = useState(() => {
    const store = createWindowManager({ storageKey: null, channelName: null, defaultLayout: () => "floating" })
    const terminal = store.open({ kind: "gallery.terminal", params: { endpoint: "LMN-4E5E" } })
    store.open({ kind: "gallery.screen", params: { endpoint: "NST-C106" } })
    store.minimise(terminal)
    return store
  })
  return (
    <WindowManagerProvider manager={manager}>
      <div className="gallery-wm-dock-stage">
        <Dock />
      </div>
    </WindowManagerProvider>
  )
}

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="gallery-wm-keys">
      {keys.map((key) => (
        <Kbd key={key} keys={key} size="sm" />
      ))}
    </span>
  )
}

const SHORTCUTS: Array<[ReactNode, string]> = [
  [<Keys key="l" keys={["ctrl+alt+left"]} />, "Snap to the left half. From a right-hand zone, float again."],
  [<Keys key="r" keys={["ctrl+alt+right"]} />, "Snap to the right half. From a left-hand zone, float again."],
  [<Keys key="u" keys={["ctrl+alt+up"]} />, "Maximise."],
  [<Keys key="d" keys={["ctrl+alt+down"]} />, "Restore a maximised window, release a snapped one, then minimise."],
  ["Double-click the title bar", "Maximise or restore."],
  ["Middle-click a dock entry", "Close the window."],
  [<Keys key="s" keys={["left", "right"]} />, "On a split handle: resize the columns. Shift takes larger steps."],
]

/* ── Section ─────────────────────────────────────────────────────────────── */

export default function WindowsSection() {
  return (
    <SectionPage>
      <Specimen title="Anatomy" description="A view in a frame (R14.1). The body supplies its actions and live state through slots; the frame is the same for every kind." wide layout="bare">
        <div className="gallery-wm-anatomy">
          <StaticFrame size="lg" className="gallery-wm-annotated" />
          <ol className="gallery-wm-legend">
            {ANATOMY.map(([name, note]) => (
              <li key={name}>
                <span className="type-label">{name}</span>
                <span className="fa-hint">{note}</span>
              </li>
            ))}
          </ol>
        </div>
      </Specimen>

      <Specimen title="States" description="The layout is state, not position: a window keeps its intent (tiled, floating) when the screen changes size." wide layout="bare">
        <div className="gallery-wm-states">
          <Example label="Tiled: a column beside the page (default at 1920px and wider)">
            <StaticFrame state="tiled" focused={false} />
          </Example>
          <Example label="Floating: above the page, resizable from every edge">
            <StaticFrame state="floating" />
          </Example>
          <Example label="Maximised: fills the workspace">
            <StaticFrame state="maximised" />
          </Example>
          <Example label="Popped out: its own browser window, synced">
            <StaticFrame state="popout" controls="popout" />
          </Example>
          <Example label="Minimised: in the dock, with its live status">
            <DockSpecimen />
          </Example>
        </div>
      </Specimen>

      <Specimen title="Snap zones" description="Drag to a side edge for a half, a corner for a quarter, the top edge to maximise. While dragging, the snap bar offers these layouts and the column beside the page.">
        {SNAP_LAYOUTS.map((group) => (
          <Example key={group.label} label={group.label}>
            <div className="gallery-wm-thumb" role="img" aria-label={group.zones.map((zone) => SNAP_ZONE_LABELS[zone]).join(", ")}>
              {group.zones.map((zone) => (
                <span key={zone} style={fracVars(SNAP_ZONES[zone]) as CSSProperties} />
              ))}
            </div>
          </Example>
        ))}
      </Specimen>

      <Specimen title="Status bar" description="Background state lives here (R14.6): never a banner in the body. The toned item never truncates; metadata gives way first." layout="stack">
        <Example label="Live">
          <StaticFrame size="sm" status="success" statusLabel="Connected" />
        </Example>
        <Example label="Reconnecting">
          <StaticFrame size="sm" status="warning" statusLabel="Reconnecting · attempt 2 of 5" meta={false} />
        </Example>
        <Example label="Offline">
          <StaticFrame size="sm" status="danger" statusLabel="Agent offline · last seen 14 min ago" meta={false} />
        </Example>
      </Specimen>

      <Specimen title="Workspace" description="A working workspace with its own manager (not saved). Open windows, drag them to the edges or the snap bar, resize, minimise and restore from the dock." wide layout="bare" backdrop>
        <MiniWorkspace />
      </Specimen>

      <Specimen title="Keyboard" description="Shortcuts act on the focused window. Bodies that own the keyboard (remote screens, terminals) opt out with data-keyboard-capture." wide layout="bare">
        <table className="gallery-wm-table">
          <tbody>
            {SHORTCUTS.map(([keys, does], index) => (
              <tr key={index}>
                <th scope="row">{keys}</th>
                <td>{does}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Specimen>

      <ContainerLab description="The frame in a table row, a header, a grid tile, a pane and a tall narrow column. Short frames keep the title bar; narrow ones shed the icon and subtitle.">
        {() => (
          <div className="gallery-wm-fill">
            <WindowFrame.Root focused aria-label="Task manager">
              <WindowFrame.AppBar
                icon={<IconTaskManager />}
                title="Task manager"
                subtitle="NST-C106"
                controls={<WindowFrame.Controls title="Task manager" onMinimise={() => {}} onToggleMaximise={() => {}} onClose={() => {}} />}
              />
              <WindowFrame.Body>
                <ProcessRows />
              </WindowFrame.Body>
              <WindowFrame.StatusBar>
                <WindowFrame.StatusGroup>
                  <WindowFrame.StatusItem tone="success">Live</WindowFrame.StatusItem>
                  <WindowFrame.StatusItem>142 processes</WindowFrame.StatusItem>
                  <WindowFrame.StatusMeta>
                    <span>CPU 17%</span>
                  </WindowFrame.StatusMeta>
                </WindowFrame.StatusGroup>
              </WindowFrame.StatusBar>
            </WindowFrame.Root>
          </div>
        )}
      </ContainerLab>

      <Rules
        do={[
          "Open secondary views as windows and keep the page in the primary window.",
          "Report connection, latency and counts in the status bar through Window.Status.",
          "Pause streams and polling while useWindowVisibility reports the window hidden.",
          "Rebuild a window from { kind, params } alone and give kinds a key() so one item opens once.",
          "Guard unsaved work with useCloseGuard.",
        ]}
        dont={[
          "Show connection state as a banner in the body.",
          "Nest a glass layer inside a window body; use fills.",
          "Put React nodes, callbacks or credentials in window params.",
          "Restyle the frame for one kind; pass actions and status through the slots.",
          "Hand-roll another window, dock or floating panel.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--glass-fill-panel", "Window material"],
          ["--shadow-2", "Unfocused window"],
          ["--shadow-3", "Focused window"],
          ["--radius-surface", "Window corners"],
          ["--gap-panels", "Gap between tiled columns; half of it on interior snap edges"],
          ["--control-h-sm", "Window controls and status bar row"],
          ["--accent-soft", "Snap preview fill"],
          ["--accent-line", "Snap preview edge"],
          ["--duration-base", "Geometry changes (tile, snap, maximise)"],
          ["--ease-standard", "Geometry easing"],
        ]}
      />
    </SectionPage>
  )
}
