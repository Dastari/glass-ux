import { useState } from "react"
import { ApprovalCard, ApprovalRecord, AssistantMessage, Composer, ConversationLog, Turn, UserMessage, type AiApproval } from "../../ai/index.js"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Button } from "../../ui/button/index.js"
import { APPROVAL, APPROVAL_DANGER, MODEL, NOW, TOOLS } from "./ai.fixtures.js"
import { AiGallery, DockedColumn, LabScroll } from "./ai.kit.js"

type Approval = AiApproval

const STATES: Array<[string, string, Approval]> = [
  ["Pending", "Warning tone: an action with consequences. Deny on the left, the solid warning Approve on the right; the expiry counts down.", APPROVAL("pending")],
  ["Executing", "Approved: the card has folded into its record, which shows the run and keeps Revoke until it starts (AiApprovalView resume_claimed).", APPROVAL("approved")],
  ["Executed", "Consumed: the card has folded into its record with the outcome.", APPROVAL("executed")],
  ["Denied", "Denied by the person; the run continues without it.", APPROVAL("denied")],
  ["Expired", "Nobody decided before ExpiresAt.", APPROVAL("expired", { decidedBy: undefined })],
  ["Revoked", "Withdrawn after approval, before it ran.", APPROVAL("revoked")],
  ["Failed", "Approved, ran and failed: the record carries the reason.", APPROVAL("failed", { outcome: "Agent offline — retry when NST-C106 reconnects" })],
]

/** A pending approval that walks pending → executing → executed when approved. */
function LiveApproval() {
  const [ask, setAsk] = useState<Approval>({ ...APPROVAL("pending"), id: "live-approval", expiresAt: NOW + 10 * 60_000 })
  const [key, setKey] = useState(0)
  return (
    <div className="ai-stack">
      <ApprovalCard
        key={key}
        ask={ask}
      />
      <div className="ai-row">
        <Button size="sm" onClick={() => setAsk((current) => ({ ...current, state: "approved", decidedBy: "Avery Quinn", decidedAt: Date.now() }))}>
          Server: executing
        </Button>
        <Button size="sm" onClick={() => setAsk((current) => ({ ...current, state: "executed", outcome: "Spooler running · 14 jobs cleared · 2.1 s" }))}>
          Server: executed
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setAsk({ ...APPROVAL("pending"), id: "live-approval", expiresAt: Date.now() + 10 * 60_000 })
            setKey((value) => value + 1)
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

/**
 * An approval inside a conversation: the card waits in the ask dock above the composer, the
 * transcript keeps a marker at its place, and the agent carries on with other work. Nothing
 * blurs; the composer stays usable.
 */
function DockedApproval() {
  const [key, setKey] = useState(0)
  return (
    <div className="ai-stack">
      <div className="ai-conversation-sample" key={key}>
        <ConversationLog surface="panel" label="Conversation with a pending approval" footer={<Composer model={MODEL} placeholder="Ask a follow-up…" />}>
          <Turn index={1}>
            <UserMessage message={{ id: "d1", role: "user", createdAt: NOW - 90_000, state: "complete", blocks: [{ kind: "markdown", text: "Restart the spooler on NST-C106 and clear the queue." }] }} />
            <AssistantMessage
              latest
              message={{
                id: "d2",
                role: "assistant",
                createdAt: NOW - 60_000,
                state: "complete",
                model: MODEL.name,
                blocks: [
                  { kind: "markdown", text: "Clearing the queue needs your approval because the stuck jobs cannot be recovered." },
                  { kind: "ask", ask: { ...APPROVAL("pending"), id: `docked-approval-${key}`, expiresAt: NOW + 10 * 60_000 } },
                  { kind: "tools", calls: [{ ...TOOLS.printers, id: "d-side", status: "running", label: "Checking the other print queues", activeLabel: "Checking the other print queues" }] },
                ],
              }}
            />
          </Turn>
        </ConversationLog>
      </div>
      <div className="ai-row">
        <Button size="sm" variant="ghost" onClick={() => setKey((value) => value + 1)}>
          Reset
        </Button>
      </div>
    </div>
  )
}

export default function AiApprovalsSection() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="Try it" description="Approve: the button confirms in place, then the card shows the run and folds into its record once the server reports it executed." layout="stack" wide>
          <LiveApproval />
        </Specimen>

        {STATES.map(([title, description, ask]) => (
          <Specimen key={title} title={title} description={description} layout="stack">
            {ask.state === "pending" || ask.state === "approved" ? <ApprovalCard ask={ask} /> : <ApprovalRecord ask={ask} />}
          </Specimen>
        ))}

        <Specimen title="Destructive, with step-up" description="Danger tone. Review and approve is the soft entry point; it turns the effect into a danger notice and the footer into Back and the one solid danger button, inside the card. The MFA note stays. Esc goes back." layout="stack">
          <ApprovalCard ask={APPROVAL_DANGER} />
        </Specimen>

        <Specimen title="Step-up only" description="Assured tier on a consequential action: the same second step in the warning tone." layout="stack">
          <ApprovalCard ask={{ ...APPROVAL("pending"), id: "step-up", stepUp: true, allowForSession: false }} />
        </Specimen>

        <Specimen title="In a conversation" description="Never modal: the card waits in the ask dock above the composer, the transcript keeps a marker with Review at its place, and the agent carries on with work that does not depend on it." wide layout="stack">
          <DockedApproval />
        </Specimen>

        <Specimen title="Docked width" description="The same card at 26rem: the switch row drops below its text, the command wraps." layout="bare">
          <DockedColumn>
            <ApprovalCard ask={{ ...APPROVAL("pending"), id: "docked" }} />
          </DockedColumn>
        </Specimen>

        <ContainerLab description="Approvals in fixed boxes scroll inside them; nothing is cut off.">
          {() => (
            <LabScroll>
              <ApprovalCard ask={{ ...APPROVAL("pending"), id: "lab" }} />
            </LabScroll>
          )}
        </ContainerLab>

        <Rules
          do={[
            "Name the action and its targets; say what happens and whether it can be undone.",
            "Show the exact command or change the server will run (the canonical preview).",
            "Confirm the decision in the button, then show the run in place.",
            "Confirm destructive and MFA approvals in a second step inside the card.",
          ]}
          dont={[
            "Open a dialog or blur the app for an approval (R13.8).",
            "Approve on behalf of the person or pre-tick “Don’t ask again”.",
            "Hide the expiry or the step-up requirement.",
            "Remove the card when it resolves; it folds into a record.",
          ]}
        />

        <TokenTable
          tokens={[
            ["--warning", "Approve (consequential)"],
            ["--warning-line", "Card edge"],
            ["--danger", "Final destructive confirm (second step)"],
            ["--duration-slow", "Fold to record"],
            ["--feedback-hold", "✓ before folding"],
          ]}
        />
      </SectionPage>
    </AiGallery>
  )
}
