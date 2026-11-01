import { Rules, SectionPage, Specimen } from "../kit.js"
import { Menu } from "../../ui/menu/index.js"
import { StatusBar } from "../../ui/status-bar/index.js"
import { WindowFrame } from "../../windows/index.js"

function ReportBar({ width }: { width?: string }) {
  return (
    <div className="w-full max-w-full" style={{ width }} data-testid={width ? `status-bar-${width}` : "status-bar-full"}>
      <StatusBar aria-label="Report status">
        <StatusBar.Start>
          <StatusBar.Item tone="success">Synced</StatusBar.Item>
          <StatusBar.Item>Quarterly report for the Harbour project</StatusBar.Item>
        </StatusBar.Start>
        <StatusBar.End>
          <StatusBar.Item giveWay={2} onClick={() => undefined} aria-label="Go to page">
            Page 12 of 48
          </StatusBar.Item>
          <StatusBar.Item giveWay={1}>4,210 words</StatusBar.Item>
          <StatusBar.Item giveWay={1}>English (Australia)</StatusBar.Item>
          <StatusBar.Item>100%</StatusBar.Item>
        </StatusBar.End>
      </StatusBar>
    </div>
  )
}

function EncodingItem() {
  return (
    <Menu.Root>
      <Menu.Trigger render={<StatusBar.Item aria-haspopup="menu">Spaces: 2</StatusBar.Item>} />
      <Menu.Popup side="top" align="end">
        <Menu.Item>Spaces: 2</Menu.Item>
        <Menu.Item>Spaces: 4</Menu.Item>
        <Menu.Item>Tabs</Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  )
}

export default function StatusBarSection() {
  return (
    <SectionPage>
      <Specimen title="Start and end groups" description="Sits on the canvas under a view. The end group holds metadata at the reading end.">
        <ReportBar />
      </Specimen>

      <Specimen title="Interactive items" description="An item with onClick is a button; a menu trigger can render one. An unavailable item stays focusable and shows its reason.">
        <StatusBar aria-label="Document status">
          <StatusBar.Start>
            <StatusBar.Item tone="warning" onClick={() => undefined} aria-label="Sync paused, resume">
              Sync paused
            </StatusBar.Item>
          </StatusBar.Start>
          <StatusBar.End>
            <EncodingItem />
            <StatusBar.Item onClick={() => undefined} disabledReason="The document is read-only">
              Line endings: LF
            </StatusBar.Item>
          </StatusBar.End>
        </StatusBar>
      </Specimen>

      <Specimen title="Narrow boxes" description="Fixed widths of the same bar. Rank 1 moves into More first, then rank 2; then the end group truncates, then the start group. The toned item never shrinks.">
        <div className="flex w-full flex-col gap-3" data-testid="status-bar-widths">
          <ReportBar width="44rem" />
          <ReportBar width="30rem" />
          <ReportBar width="20rem" />
          <ReportBar width="12rem" />
        </div>
      </Specimen>

      <Specimen title="In a window" description="WindowFrame.StatusBar is built on StatusBar, so its items take the same props, giveWay included.">
        <div className="h-48 w-full max-w-120">
          <WindowFrame.Root focused className="glass-panel h-full">
            <WindowFrame.AppBar title="Build log" />
            <WindowFrame.Body variant="fill" />
            <WindowFrame.StatusBar>
              <WindowFrame.StatusItem tone="success">Connected</WindowFrame.StatusItem>
              <WindowFrame.StatusItem giveWay={1}>1,204 lines</WindowFrame.StatusItem>
              <WindowFrame.StatusMeta>
                <span>28 ms</span>
              </WindowFrame.StatusMeta>
            </WindowFrame.StatusBar>
          </WindowFrame.Root>
        </div>
      </Specimen>

      <Rules
        do={["Keep connection, sync and queued work in the status bar of the view they concern (R14.6)", "Rank what can leave with giveWay, lowest first", "Name a button whose visible value does not say what it does"]}
        dont={["Put ticking text in StatusBar.Group: it is a live region", "Use a status bar for primary actions", "Give the state itself a rank"]}
      />
    </SectionPage>
  )
}
