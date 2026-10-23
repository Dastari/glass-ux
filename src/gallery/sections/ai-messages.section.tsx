import { useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { DemoScope } from "../demo-scope.js"
import { IconLayers } from "../../icons/generated/icons.js"
import { AssistantMessage, CodeBlock, Composer, ConversationLog, MessageSkeleton, Reasoning, SystemNotice, Turn, UserMessage, type AiMessage, type RunState } from "../../ai/index.js"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Button } from "../../ui/button/index.js"
import { CONVERSATION, MODEL, NOW, SOURCES, TOOLS } from "./ai.fixtures.js"
import { AiGallery, LabScroll, TemplateLinks } from "./ai.kit.js"

const MARKDOWN = `## Patch window for Cedar Vale

Install **KB5044284** on the clinic PCs tonight. Reception waits until Saturday because it is in use until 6 pm[^2].

1. Pause the clinic group at 9:45 pm
2. Install and restart at 10:00 pm
3. Confirm compliance in the morning

- [x] Back up CDV-CLINIC02
- [ ] Notify [Cedar Vale Collective](/organisations/cedarvale)

> Restarting drops any open telehealth calls.

Run \`Get-HotFix -Id KB5044284\` to check one endpoint, or see the [release notes](https://support.microsoft.com/kb/5044284).

| Group | Endpoints | Missing |
| --- | ---: | ---: |
| Clinic | 12 | 6 |
| Reception | 3 | 3 |

\`\`\`powershell
Get-HotFix -Id KB5044284 -ComputerName CDV-CLINIC02, CDV-CLINIC03 |
  Select-Object PSComputerName, InstalledOn
\`\`\`
`

const LONG_SCRIPT = Array.from({ length: 28 }, (_, index) =>
  index % 7 === 0 ? `# Step ${index / 7 + 1}` : `Write-Output "Checking print queue ${index} on $env:COMPUTERNAME" | Out-File -Append C:\\ProgramData\\Glass UX\\spooler.log`
).join("\n")

const STOPPED = "There are **7 open tickets** at Northstar Studio. The oldest, #4790, is a" // tokens:allow ticket number, not a colour

const STREAM = "The spooler has been running since **10:12 am** and the queue on the Level 2 Ricoh is empty. Mira printed two documents in the last ten minutes; both completed."

const turn = CONVERSATION.find((item) => item.kind === "turn" && item.index === 1)
const first = turn?.kind === "turn" ? turn : null

const base = (extra: Partial<AiMessage>): AiMessage => ({ id: "x", role: "assistant", createdAt: NOW - 60_000, state: "complete", model: MODEL.name, blocks: [], ...extra })

const FOLLOW_ANSWER =
  "The sample printer has been online since **10:12 am** and its queue is empty. Two documents printed on the Level 2 printer in the last ten minutes; both completed.\n\n- The print spooler has not stopped since the restart\n- The driver is still `4.2.1`; the fix is in `4.3.0`\n\nI can update the driver tonight after 6 pm, once the studio has signed out."
const FOLLOW_EARLIER = [1, 2, 3].map((index) => ({
  index,
  user: { id: `fu${index}`, role: "user", createdAt: NOW - 600_000, state: "complete", blocks: [{ kind: "markdown", text: `Sample question ${index} about the studio printers?` }] } as AiMessage,
  reply: base({ id: `fa${index}`, blocks: [{ kind: "markdown", text: Array.from({ length: 3 }, (_, p) => `Sample paragraph ${p + 1}: the studio queue has ${index + p} waiting jobs and two printers online.`).join("\n\n") }] }),
}))
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** A log the reader follows while an answer streams in: a tool call, then words, then the footer. */
function FollowingLog() {
  const [items, setItems] = useState(FOLLOW_EARLIER)
  const [run, setRun] = useState<RunState>("idle")
  const update = (id: string, change: (message: AiMessage) => AiMessage) => setItems((current) => current.map((item) => (item.reply.id === id ? { ...item, reply: change(item.reply) } : item)))
  const send = async (text: string) => {
    const id = `live-${items.length + 1}`
    setRun("sending")
    await pause(250)
    setItems((current) => [...current, { index: current.length + 1, user: { id: `${id}-q`, role: "user", createdAt: Date.now(), state: "complete", blocks: [{ kind: "markdown", text }] }, reply: base({ id, createdAt: Date.now(), state: "streaming" }) }])
    setRun("running")
    // An earlier answer grows on its own meanwhile, as work beside a pending approval does.
    const grow = (ms: number, text: string) => setTimeout(() => update("fa3", (reply) => ({ ...reply, blocks: [...reply.blocks, { kind: "markdown", text }] })), ms)
    grow(700, "Checking the Level 2 printer's queue and toner.")
    grow(2600, "While you decide: the Level 2 printer is online and toner is at 64 %.")
    await pause(500)
    update(id, (reply) => ({ ...reply, blocks: [{ kind: "tools", calls: [{ id: `${id}-t`, toolId: "sample.query", label: "Read the printer's status", activeLabel: "Reading the printer's status", status: "running" }] }] }))
    await pause(1400)
    update(id, (reply) => ({ ...reply, blocks: [{ kind: "tools", calls: [{ id: `${id}-t`, toolId: "sample.query", label: "Read the printer's status", status: "succeeded", elapsedMs: 1380 }] }, { kind: "markdown", text: "" }] }))
    let shown = ""
    for (const word of FOLLOW_ANSWER.split(/(?<=\s)/)) {
      shown += word
      const partial = shown
      update(id, (reply) => ({ ...reply, blocks: reply.blocks.map((block) => (block.kind === "markdown" ? { kind: "markdown", text: partial } : block)) }))
      await pause(28)
    }
    update(id, (reply) => ({ ...reply, state: "complete" }))
    setRun("idle")
  }
  return (
    <div className="h-120 w-full" data-testid="conversation-follow">
      <ConversationLog surface="panel" label="Sample conversation" footer={<Composer aria-label="Message the assistant" run={run} onSend={(text) => void send(text)} onStop={() => undefined} />}>
        {items.map((item, position) => (
          <Turn key={item.index} index={item.index}>
            <UserMessage message={item.user} />
            <AssistantMessage message={item.reply} latest={position === items.length - 1} />
          </Turn>
        ))}
      </ConversationLog>
    </div>
  )
}

function StreamingDemo() {
  const [text, setText] = useState("")
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  useEffect(() => () => clearInterval(timer.current), [])
  const start = () => {
    clearInterval(timer.current)
    const words = STREAM.split(/(?<=\s)/)
    let index = 0
    setText("")
    setRunning(true)
    timer.current = setInterval(() => {
      index += 1
      setText(words.slice(0, index).join(""))
      if (index >= words.length) {
        clearInterval(timer.current)
        setRunning(false)
      }
    }, 60)
  }
  return (
    <div className="ai-stack">
      <AssistantMessage latest message={base({ id: "stream", state: running ? "streaming" : "complete", blocks: [{ kind: "markdown", text: text || "Press Stream to watch the caret append in place." }] })} activity={running && !text ? { state: "working", model: MODEL.name } : undefined} />
      <div>
        <Button size="sm" onClick={start} status={running ? "pending" : undefined} pendingLabel="Streaming…">
          Stream an answer
        </Button>
      </div>
    </div>
  )
}

function SampleTurn({ children }: { children: ReactNode }) {
  const scope = useContext(DemoScope)
  return <Turn index={1} aria-label={scope ? `${scope}: Turn 1` : "Turn 1"}>{children}</Turn>
}

export default function AiMessagesSection() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="Layout templates" description="The same components assembled full-screen: the landing, a long conversation with every block, the docked pane and the conversation states." wide>
          <TemplateLinks />
        </Specimen>

        <Specimen title="A turn" description="The prompt is a compact bubble on the right with its attachments above. The answer has no bubble; tables, charts, images and code break out wider. Message actions show on hover and focus, and always on the latest answer." wide layout="bare">
          <div className="ai-stack">
            {first ? (
              <SampleTurn>
                <UserMessage message={first.user} editable />
                {first.replies.map((message) => (
                  <AssistantMessage key={message.id} message={message} latest />
                ))}
              </SampleTurn>
            ) : null}
          </div>
        </Specimen>

        <Specimen title="Conversation notices" description="Quiet inline notices identify changes to conversation context. Use an icon and an optional timestamp; omit the timestamp for a persistent notice." layout="stack">
          <SystemNotice icon={<IconLayers />} at={NOW - 46 * 60_000}>
            Sample document added to the conversation context
          </SystemNotice>
          <SystemNotice>Conversation model changed</SystemNotice>
        </Specimen>

        <Specimen title="Markdown" description="Headings scale down for chat; lists, task lists, quotes, inline code and links. Glass UX links become context chips, external links say they leave, [^n] becomes a citation. Code and tables break out of the measure." layout="bare" wide>
          <AssistantMessage message={base({ id: "md", blocks: [{ kind: "markdown", text: MARKDOWN }, { kind: "sources", sources: SOURCES.slice(1, 3).map((source, index) => ({ ...source, index: index + 2 })) }] })} latest />
        </Specimen>

        <Specimen title="Code blocks" description="Language label, copy with an in-place ✓, wrap toggle and optional line numbers. Highlighting loads on the first block; until then the same text sits in the same lines. Long blocks show their first lines." layout="stack">
          <CodeBlock language="powershell" code={'Stop-Service -Name Spooler -Force\nRemove-Item "$env:SystemRoot\\System32\\spool\\PRINTERS\\*" -Force\nStart-Service -Name Spooler'} />
          <CodeBlock language="json" lineNumbers code={JSON.stringify({ endpointId: "NST-C106", queue: "Ricoh MP 2555 Reception", stuckJobs: 14, spooler: { state: "Stopped", restarts: 3 } }, null, 2)} />
          <CodeBlock language="powershell" title="Check-Spooler.ps1" lineNumbers code={LONG_SCRIPT} />
          <CodeBlock language="log" wrap code={"2026-10-11 21:38:51 ERROR Faulting module PrintConfig.dll, version 10.0.26300.1, exception 0xc0000005, process spoolsv.exe"} />
        </Specimen>

        <Specimen title="Reasoning and streaming" description="The reasoning summary folds to one line with the time it took. Streaming text appends after a static caret; earlier lines never reflow." layout="stack">
          <Reasoning reasoning={{ seconds: 4, summary: "Find the organisation, list its offline endpoints, keep those silent for more than a day, then look for a shared site or time." }} />
          <Reasoning reasoning={{ seconds: 2, running: true, summary: "Reading the spooler events on NST-C106…" }} defaultOpen />
          <StreamingDemo />
        </Specimen>

        <Specimen title="Follow a streaming answer" description="A reader at the end of the log stays there while an answer streams in and completes: send a message and the tool call, each word and the answer's actions keep the end in view. Scrolled up, nothing moves and New messages appears instead." wide layout="bare">
          <FollowingLog />
        </Specimen>

        <Specimen title="States" description="Failure, stop and retention show in place as the message's last block, in the same tones as everywhere else." layout="stack">
          <AssistantMessage message={base({ id: "f", state: "failed", blocks: [{ kind: "tools", calls: [TOOLS.eventlog] }], failure: { code: "provider_response_deadline_expired", reason: "The AI provider did not respond within the allowed time. Nothing was changed on NST-C112.", retryable: true } })} />
          <AssistantMessage message={base({ id: "c", state: "cancelled", blocks: [{ kind: "markdown", text: STOPPED }] })} />
          <AssistantMessage message={base({ id: "p", state: "purged" })} />
          <AssistantMessage message={base({ id: "u", state: "failed", failure: { code: "budget_exhausted", reason: "Your daily AI allowance is used up. It resets at 4:00 pm.", retryable: false } })} />
        </Specimen>

        <Specimen title="Loading" description="A loading conversation draws its turns in their final boxes: the prompt bubble, prose lines and a card." layout="stack">
          <MessageSkeleton />
        </Specimen>

        <Specimen title="Over imagery" description="Bubbles and cards hold their contrast on a busy background." backdrop>
          <div className="ai-stack">
            <UserMessage message={{ id: "b1", role: "user", createdAt: NOW, state: "complete", blocks: [{ kind: "markdown", text: "Is the queue empty?" }] }} />
          </div>
        </Specimen>

        <ContainerLab description="An answer in a row, a header, a tile, a pane and a tall narrow column: the column scrolls, the mark steps aside below 22rem, prose drops to the body size below 34rem.">
          {() => (
            <LabScroll>
              {first ? (
                <SampleTurn>
                  <UserMessage message={first.user} />
                  <AssistantMessage message={base({ id: "lab", blocks: [{ kind: "markdown", text: "**6 endpoints** at [Northstar Studio](/organisations/northstar) have not checked in for more than 24 hours." }] })} latest />
                </SampleTurn>
              ) : null}
            </LabScroll>
          )}
        </ContainerLab>

        <Rules
          do={[
            "Keep prose on the reading column; let wide blocks (tables, charts, images, code) break out.",
            "Show failure, stop and retention in the message itself, with the reason and Retry where the server admits it.",
            "Announce completed answers once, politely; never per token.",
            "Link Glass UX entities with internal paths so they render as context chips.",
          ]}
          dont={[
            "Put the assistant in a bubble or give it a name label — the mark already says who it is.",
            "Blink the caret or animate text in; the caret is static and text only appends.",
            "Write chirpy chrome copy (“Sure! Here's…”, emoji, exclamation marks).",
            "Move earlier lines while an answer streams.",
          ]}
        />

        <TokenTable
          tokens={[
            ["--measure", "Prose width"],
            ["--type-subtitle-size", "Prose size (wide containers)"],
            ["--space-6", "Prose line (wide containers)"],
            ["--glass-fill-control", "Prompt bubble"],
            ["--radius-tile", "Bubble and card radius"],
            ["--accent", "Streaming caret"],
            ["--font-mono", "Code"],
            ["--accent-text", "Keywords, links"],
          ]}
        />
      </SectionPage>
    </AiGallery>
  )
}
