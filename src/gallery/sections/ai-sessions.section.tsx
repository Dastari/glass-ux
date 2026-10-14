import { useState } from "react"
import { IconHistory, IconMaximise, IconNewChat } from "../../icons/generated/icons.js"
import { AiStatusStrip, AssistantPane, Composer, ConversationContext, ConversationLog, DesktopSession, SessionNav, SuggestionChips, type DesktopState } from "../../ai/index.js"
import { ContainerLab, Example, Rules, SectionPage, Specimen } from "../kit.js"
import { Button } from "../../ui/button/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { toast } from "../../ui/toast/index.js"
import { ALL_TOOLS, BUDGET, E, MODEL, NOW, PROJECTS, REFERENCED, SCOPED_SUGGESTIONS, SESSIONS, SOURCES } from "./ai.fixtures.js"
import { screenshot } from "./ai.screens.js"
import { AiGallery, TemplateLinks } from "./ai.kit.js"

const DESKTOP_STATES: DesktopState[] = ["observing", "controlling", "awaiting-action", "paused", "human", "ended", "expired", "failed"]

function Desktop() {
  const [state, setState] = useState<DesktopState>("controlling")
  return (
    <div className="ai-stack">
      <Segmented
        size="sm"
        aria-label="Desktop session state"
        value={state}
        onValueChange={setState}
        options={DESKTOP_STATES.map((value) => ({ value, label: value === "awaiting-action" ? "Approval" : value[0]!.toUpperCase() + value.slice(1) }))}
      />
      <DesktopSession
        endpoint={E.c106Online}
        state={state}
        user="AzureAD\\MiraRowan"
        startedAt={NOW - 134_000}
        leaseEndsAt={NOW + 12 * 60_000}
        reason={state === "paused" ? "The video froze; input is paused" : state === "failed" ? "Agent offline" : state === "expired" ? "The 15-minute control lease ended" : undefined}
        screen={{ id: "d1", src: screenshot({ app: "Devices and Printers", hue: 250 }), alt: "NST-C106 with Devices and Printers open", width: 1600, height: 1000 }}
        steps={[
          { id: "1", label: "Opened Devices and Printers", status: "succeeded" },
          { id: "2", label: "Selected Ricoh IM C3000 · Level 2", status: "succeeded" },
          { id: "3", label: "Set it as the default printer", status: state === "awaiting-action" ? "awaiting-approval" : state === "controlling" ? "running" : "queued" },
        ]}
        pendingAction={{ label: "Set Ricoh IM C3000 · Level 2 as default", effect: "Changes Mira Rowan's default printer. Reversible." }}
        onStop={() => toast.info("Stopped. You have the screen.")}
        onTakeOver={() => setState("human")}
        onResume={() => setState("controlling")}
      />
    </div>
  )
}

export default function AiSessionsSection() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="Templates" description="The panes assembled: landing, conversation on the reading column (drawer, inspector at 1920), docked beside an endpoint (20–26rem, and as a floating window) and the states." wide>
          <TemplateLinks />
        </Specimen>

        <Specimen title="Drawer" description="New chat, search, the two views with counts, projects, sessions by day. A spinner while working, a warning dot waiting for you, a danger dot after a failed run, an accent dot and bold title when unread. ⋯ and right-click carry the session actions. The drawer sets the width: at its narrowest, default and widest, everything fits and titles truncate." layout="row" wide>
          {(
            [
              ["min", "14rem · narrowest"],
              [undefined, "16.5rem · default"],
              ["max", "28rem · widest"],
            ] as const
          ).map(([width, label]) => (
            <Example key={label} label={label}>
              <div className="glass-control ai-drawer-sample" data-width={width} data-drawer-sample={width ?? "default"}>
                <SessionNav
                  sessions={SESSIONS}
                  projects={PROJECTS}
                  activeId="s-cedar-annex"
                  counts={{ conversations: 8, archived: 2 }}
                  onNewChat={() => {}}
                  onRename={() => {}}
                  onArchive={() => {}}
                  onDelete={() => new Promise((resolve) => setTimeout(resolve, 500))}
                  onOpenWindow={() => {}}
                  onOpenSettings={() => {}}
                />
              </div>
            </Example>
          ))}
        </Specimen>

        <Specimen title="Drawer states" description="Loading rows in their final box; an empty history; no search matches." layout="bare">
          <div className="ai-row">
            <div className="glass-control ai-drawer-sample">
              <SessionNav sessions={[]} loading counts={{ conversations: 0, archived: 0 }} onNewChat={() => {}} />
            </div>
            <div className="glass-control ai-drawer-sample">
              <SessionNav sessions={[]} counts={{ conversations: 0, archived: 6 }} onNewChat={() => {}} />
            </div>
            <div className="glass-control ai-drawer-sample">
              <SessionNav sessions={SESSIONS} initialQuery="spooler" counts={{ conversations: 8, archived: 2 }} onNewChat={() => {}} />
            </div>
          </div>
        </Specimen>

        <Specimen title="Docked assistant" description="The pane beside an endpoint page, scoped to it: a new chat offers contextual suggestions. The composer floats over the bottom of the pane with the status line inside it." layout="bare">
          <div className="ai-pane-sample">
            <AssistantPane
              scope="NST-C106"
              actions={
                <>
                  <Button variant="ghost" size="sm" icon={<IconNewChat />} aria-label="New chat about NST-C106" />
                  <Button variant="ghost" size="sm" icon={<IconHistory />} aria-label="Conversations" />
                  <Button variant="ghost" size="sm" icon={<IconMaximise />} aria-label="Open full page" />
                </>
              }
            >
              <ConversationLog
                surface="panel"
                footer={<Composer model={MODEL} context={[E.c106Online]} onContextChange={() => {}} onAttach={() => {}} placeholder="Ask about NST-C106…" status={<AiStatusStrip stream="connected" budget={BUDGET} model={MODEL.name} />} />}
              >
                <SuggestionChips align="start" suggestions={SCOPED_SUGGESTIONS} onSelect={() => {}} />
              </ConversationLog>
            </AssistantPane>
          </div>
        </Specimen>

        <Specimen title="Conversation inspector" description="Beside the conversation from 1920px: scope, referenced entities, tools used, sources and the budget." layout="bare">
          <div className="glass-control ai-inspector-sample">
            <ConversationContext scope={null} referenced={REFERENCED} tools={ALL_TOOLS} sources={SOURCES} budget={BUDGET} />
          </div>
        </Specimen>

        <Specimen title="Supervised desktop control" description="Planned (glass-ux-ai-desktop-control): the live screen with who holds control, the steps, a lease countdown and a large Stop. Grants and consequential actions are approvals." wide layout="stack">
          <Desktop />
        </Specimen>

        <ContainerLab description="The drawer content in fixed boxes: it fills the box, its list scrolls, titles truncate.">
          {() => (
            <SessionNav sessions={SESSIONS} counts={{ conversations: 8, archived: 2 }} onNewChat={() => {}} />
          )}
        </ContainerLab>

        <Rules
          do={[
            "Show what a session needs (working, waiting for you, failed, unread) at the row's trailing edge.",
            "Scope a docked conversation to the page it sits beside, and say so in the header.",
            "Keep Stop and Take over visible whenever the AI holds a screen.",
          ]}
          dont={[
            "Infer a session's state from time; take it from the server's events.",
            "Hide the inspector's budget behind a menu.",
            "Let the AI keep control after the video freezes.",
          ]}
        />
      </SectionPage>
    </AiGallery>
  )
}
