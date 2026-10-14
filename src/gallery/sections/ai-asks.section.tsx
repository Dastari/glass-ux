import { useState } from "react"
import { AskCard, AskMarker, AssistantMessage, AssistantPane, Composer, ConversationLog, Turn, UserMessage, type AiAsk } from "../../ai/index.js"
import { Button } from "../../ui/button/index.js"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { APPROVAL_DANGER, ASKS, MODEL, NOW } from "./ai.fixtures.js"
import { AiGallery, DockedColumn, LabScroll } from "./ai.kit.js"

const ALL: Array<[string, string, AiAsk]> = [
  ["Single choice", "Radio cards when each option needs a sentence; the submit names the outcome.", ASKS.single],
  ["Several choices", "Checkboxes pick items from a list, with Select all and a live count.", ASKS.multi],
  ["Quick replies", "A few short answers as pills; one tap answers. A typed reply still works.", ASKS.quick],
  ["Short form", "Stacked fields, one per row, capped at the form measure; pre-filled by the agent, validated on blur.", ASKS.form],
  ["Entity", "Search the application's entities; picks become removable chips.", ASKS.entity],
  ["Date and time", "The agent's suggestions as one-tap choices, or an exact time, in the stated time zone.", ASKS.datetime],
  ["Confirmation", "Yes or no with the consequence spelt out.", ASKS.confirm],
  ["Destructive confirmation", "The soft entry point turns the consequence into a danger notice and the footer into Back and the solid danger button, inside the card. Esc goes back.", ASKS.confirmDanger],
  ["Order", "Put options in order with the arrow buttons (or ↑ ↓ on them).", ASKS.rank],
  ["Clarification", "The agent's best guesses as one-tap answers, or free text.", ASKS.clarify],
]

/**
 * Three asks pending in one conversation: the dock shows the oldest with "1 of 3" and
 * previous/next, folds to one line, and caps its height; the transcript keeps a marker at
 * each ask's place. `narrow` puts it in a docked-width pane, where it starts folded.
 */
function AskDockDemo({ narrow = false }: { narrow?: boolean }) {
  const [key, setKey] = useState(0)
  const conversation = (
    <ConversationLog key={key} surface="panel" label={narrow ? "Docked conversation with three asks" : "Conversation with three asks"} footer={<Composer model={MODEL} placeholder="Ask a follow-up…" />}>
      <Turn index={1}>
        <UserMessage message={{ id: `k1-${key}`, role: "user", createdAt: NOW - 120_000, state: "complete", blocks: [{ kind: "markdown", text: "Patch the clinic tonight, and reset NST-C106 while you are at it." }] }} />
        <AssistantMessage
          latest
          message={{
            id: `k2-${key}`,
            role: "assistant",
            createdAt: NOW - 60_000,
            state: "complete",
            model: MODEL.name,
            blocks: [
              { kind: "markdown", text: "Three things need you before I can go on." },
              { kind: "ask", ask: { ...ASKS.multi, id: `dock-multi-${narrow}-${key}` } },
              { kind: "ask", ask: { ...ASKS.datetime, id: `dock-time-${narrow}-${key}` } },
              { kind: "ask", ask: { ...APPROVAL_DANGER, id: `dock-reset-${narrow}-${key}`, expiresAt: NOW + 30 * 60_000 } },
            ],
          }}
        />
      </Turn>
    </ConversationLog>
  )
  return (
    <div className="ai-stack">
      {narrow ? (
        <div className="ai-pane-sample" data-width="23">
          <AssistantPane scope="NST-C106">{conversation}</AssistantPane>
        </div>
      ) : (
        <div className="ai-conversation-sample">{conversation}</div>
      )}
      <div className="ai-row">
        <Button size="sm" variant="ghost" onClick={() => setKey((value) => value + 1)}>
          Reset
        </Button>
      </div>
    </div>
  )
}

export default function AiAsksSection() {
  return (
    <AiGallery>
      <SectionPage>
        {ALL.map(([title, description, ask]) => (
          <Specimen key={title} title={title} description={description} layout="stack">
            <AskCard ask={ask} />
          </Specimen>
        ))}

        <Specimen title="Records" description="Every ask folds into one line once resolved: the decision in words, who, when. The fold animates from the ask's height. While it waits in the dock, its place shows the same line with Review." layout="stack" wide>
          <AskCard ask={ASKS.singleDone} />
          <AskCard ask={ASKS.multiDone} />
          <AskCard ask={ASKS.formDone} />
          <AskCard ask={ASKS.expired} />
          <AskMarker ask={ASKS.entity} />
        </Specimen>

        <Specimen title="Ask dock" description="Never modal (R13.8): pending asks wait above the composer, oldest first, one at a time with “1 of 3”. The composer and the transcript keep working; each ask's place holds a marker whose Review brings it to the front." wide layout="stack">
          <AskDockDemo />
        </Specimen>

        <Specimen title="Ask dock, docked pane" description="At 23rem the dock starts folded to one line, the question; it unfolds upwards inside the pane." layout="bare">
          <AskDockDemo narrow />
        </Specimen>

        <Specimen title="Docked width" description="Asks at 26rem: radio cards stack, forms keep one field per row." layout="bare">
          <DockedColumn>
            <AskCard ask={{ ...ASKS.single, id: "docked-single" }} />
            <AskCard ask={{ ...ASKS.datetime, id: "docked-datetime" }} />
          </DockedColumn>
        </Specimen>

        <ContainerLab description="Asks in fixed boxes scroll inside them; controls never squeeze side by side.">
          {() => (
            <LabScroll>
              <AskCard ask={ASKS.multi} />
            </LabScroll>
          )}
        </ContainerLab>

        <Rules
          do={[
            "Ask one thing at a time, as one line, with the data that decides it underneath.",
            "Pre-fill what the agent already knows.",
            "Name the outcome on the submit button (“Set as default”, “Schedule”).",
            "Fold resolved asks into a record; never remove them.",
          ]}
          dont={[
            "Put two fields side by side in an ask (R15.2).",
            "Use a lone checkbox for a yes/no setting; it is a switch.",
            "Open a dialog or a scrim for an ask: it waits in the dock while everything else keeps working.",
          ]}
        />

        <TokenTable
          tokens={[
            ["--form-measure", "Control column"],
            ["--accent-line", "Ask edge"],
            ["--accent-soft", "Ask icon tile"],
            ["--duration-slow", "Fold"],
            ["--reading-column", "Ask dock and composer width"],
            ["--item-h", "Record height"],
          ]}
        />
      </SectionPage>
    </AiGallery>
  )
}
