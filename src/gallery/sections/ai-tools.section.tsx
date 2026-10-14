import { useEffect, useState } from "react"
import { ProviderActivity, ToolCallRow, ToolCallSkeleton, ToolGroup, type AiToolCall, type ToolStatus } from "../../ai/index.js"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Button } from "../../ui/button/index.js"
import { E, MODEL, TOOLS } from "./ai.fixtures.js"
import { AiGallery, LabScroll } from "./ai.kit.js"

const STATUSES: Array<[ToolStatus, Partial<AiToolCall>]> = [
  ["queued", { label: "Read the event log on LMN-4E5E", activeLabel: "Waiting to read the event log", targets: [E.acs4e5e] }],
  ["running", { label: "Queried 1,284 endpoints", activeLabel: "Querying 1,284 endpoints", elapsedMs: 1200 }],
  ["succeeded", { label: "Queried 1,284 endpoints", elapsedMs: 1410 }],
  ["failed", { label: "Read the event log on NST-C106", reason: "Agent offline — retry when NST-C106 reconnects", elapsedMs: 5000 }],
  ["cancelled", { label: "Restart NST-C106", elapsedMs: 300 }],
  ["awaiting-approval", { label: "Run Clear-PrintQueue.ps1 on NST-C106" }],
]

function LiveGroup() {
  const [step, setStep] = useState(3)
  useEffect(() => {
    if (step >= 3) return
    const timer = setTimeout(() => setStep((value) => value + 1), 1100)
    return () => clearTimeout(timer)
  }, [step])
  const calls: AiToolCall[] = [TOOLS.org, TOOLS.endpoints, TOOLS.heartbeats].map((call, index) => ({
    ...call,
    status: index < step ? "succeeded" : index === step ? "running" : "queued",
    elapsedMs: index < step ? call.elapsedMs : undefined,
  }))
  return (
    <div className="ai-stack">
      <ToolGroup calls={calls} />
      <div>
        <Button size="sm" onClick={() => setStep(0)} status={step < 3 ? "pending" : undefined} pendingLabel="Running…">
          Run the group
        </Button>
      </div>
    </div>
  )
}

export default function AiToolsSection() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="Statuses" description="The same row in every state; only the glyph, its tone and the label's strength change. Running rows carry a thin indeterminate line; failures keep their reason visible." layout="stack">
          {STATUSES.map(([status, extra]) => (
            <ToolCallRow key={status} call={{ id: status, toolId: "glass-ux.endpoints.query", icon: undefined, ...extra, status, label: extra.label! }} />
          ))}
        </Specimen>

        <Specimen title="Details" description="Expanding a row shows the tool, its targets, the arguments and a result preview as JSON, each copyable. Details the browser does not hold are fetched when the row opens." layout="stack">
          <ToolCallRow call={TOOLS.endpoints} defaultOpen />
          <ToolCallRow call={{ ...TOOLS.snapshot, args: undefined, result: undefined }} />
          <ToolCallRow call={TOOLS.eventlog} />
        </Specimen>

        <Specimen title="Groups" description="Consecutive calls fold into one summary row with their glyphs and total time; the count of running and failed calls stays visible." layout="stack">
          <ToolGroup calls={[TOOLS.org, TOOLS.endpoints, TOOLS.heartbeats, TOOLS.web]} />
          <ToolGroup calls={[TOOLS.eventlog, TOOLS.snapshot]} />
          <LiveGroup />
        </Specimen>

        <Specimen title="Provider activity" description="Between tool calls: working, waiting on an endpoint, retrying the provider, or searching the web. Replaced in place by the answer." layout="stack">
          <ProviderActivity status={{ state: "working", model: MODEL.name }} />
          <ProviderActivity status={{ state: "waiting", detail: "NST-C106 is answering", model: MODEL.name }} />
          <ProviderActivity status={{ state: "retrying", detail: "Provider busy · attempt 2 of 3", model: MODEL.name }} />
          <ProviderActivity status={{ state: "searching", detail: "TasNetworks Cedar Annex outage" }} />
          <ToolCallSkeleton />
        </Specimen>

        <ContainerLab description="Target names and the glyph stack drop below 30rem; the label truncates; the time stays.">
          {() => (
            <LabScroll>
              <ToolGroup calls={[TOOLS.org, TOOLS.endpoints, TOOLS.heartbeats]} />
              <ToolCallRow call={TOOLS.wake} />
            </LabScroll>
          )}
        </ContainerLab>

        <Rules
          do={[
            "Label calls with a past-tense verb and a count: “Queried 1,284 endpoints”.",
            "Update the row's status in place; never add a second row for the result.",
            "Say why a call failed and what to do next.",
          ]}
          dont={[
            "Show raw tool ids as the label; they belong in the details.",
            "Expand tool details by default in a conversation.",
            "Animate anything but the spinner and the progress line.",
          ]}
        />

        <TokenTable
          tokens={[
            ["--item-h", "Row height"],
            ["--fill-hover", "Row hover"],
            ["--success-text", "Done"],
            ["--danger-text", "Failed"],
            ["--warning-text", "Waiting for approval"],
            ["--accent-text", "Running"],
            ["--duration-shimmer", "Progress line"],
          ]}
        />
      </SectionPage>
    </AiGallery>
  )
}
