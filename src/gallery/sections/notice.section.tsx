import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Button } from "../../ui/button/index.js"
import { Notice } from "../../ui/notice/index.js"

export default function NoticeSection() {
  return (
    <SectionPage>
      <Specimen title="Tones" description="Info, success, warning and danger. Text stays in text colours; the icon and the soft fill carry the tone." layout="stack">
        <div className="flex w-160 max-w-full flex-col gap-3">
          <Notice>Changes made here apply to LMN-7C71. Some settings need the agent to reconnect before they take effect.</Notice>
          <Notice tone="success" title="Policy applied">NST-C106 now follows Workstations · Production.</Notice>
          <Notice
            tone="warning"
            title="Reboot pending"
            action={
              <Button size="sm" variant="secondary">
                Schedule
              </Button>
            }
          >
            Windows updates on NST-SERVER finish after the next restart.
          </Notice>
          <Notice tone="danger" title="Agent outdated">
            LMN-4E5E runs agent 2.9.1; remote control needs 3.0 or later.
          </Notice>
        </div>
      </Specimen>

      <Specimen title="Compact" description="One line at control height for dense places; the text truncates and the full sentence is in the title." layout="stack">
        <div className="flex w-120 max-w-full flex-col gap-3">
          <Notice compact>Read-only: you are viewing Orbit Workspace as an auditor.</Notice>
          <Notice compact tone="warning" title="Maintenance">
            STUDIO-VM is in maintenance until 18:00 — alerts are paused.
          </Notice>
        </div>
      </Specimen>

      <ContainerLab description="Notices wrap in the tile and tall column; the compact one truncates.">
        {() => (
          <div className="flex flex-col gap-2">
            <Notice compact tone="warning">
              STUDIO-VM is in maintenance until 18:00 — alerts are paused.
            </Notice>
          </div>
        )}
      </ContainerLab>

      <Rules
        do={[
          "Give a notice a fixed place in the layout (a dialog body, the top of a form).",
          "Write one or two sentences that say what applies and what to do.",
          "Use the tone for meaning: warning before a consequence, danger for a fault.",
        ]}
        dont={[
          "Inject a notice above content after an action; use a toast or the button (R9.1).",
          "Show connection state in a notice; it lives in the status bar (R14.6).",
          "Stack notices; merge them or fix the cause.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--info-soft", "Info fill"],
          ["--info-line", "Info rim (55%)"],
          ["--info-text", "Info icon"],
          ["--radius-tile", "Radius"],
          ["--control-h-md", "Compact height"],
        ]}
      />
    </SectionPage>
  )
}
