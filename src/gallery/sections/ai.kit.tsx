/**
 * Shared scaffolding for the AI gallery sections: the fixture resolver and demo handlers,
 * a scrolling lab cell (a conversation column scrolls; it never clips) and links to the
 * full-screen /preview/ai templates.
 */
import type { ReactNode } from "react"
import { IconPopOut } from "../../icons/generated/icons.js"
import { ConversationHandlersProvider, EntityResolverProvider, type ConversationHandlers } from "../../ai/index.js"
import { toast } from "../../ui/toast/index.js"
import { demoResolver } from "./ai.fixtures.js"
import { DeviceGallery } from "./devices.fixtures.js"

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const HANDLERS: Partial<ConversationHandlers> = {
  answer: () => wait(700),
  decide: () => wait(900),
  retry: () => wait(900),
  feedback: () => {},
  editMessage: () => toast.info("Editing the last message"),
  openMessageWindow: () => toast.info("Response opened in a window"),
  openResultWindow: (result) => toast.info(`${result.title} opened in a window`),
  loadToolDetails: async () => {
    await wait(900)
    return { args: { endpointId: "NST-C106", since: "PT72H" }, result: { count: 3, items: [{ id: 7031, level: "Error", source: "Service Control Manager" }] } }
  },
}

/** Fixture data and demo handlers around an AI gallery section. */
export function AiGallery({ children, handlers }: { children: ReactNode; handlers?: Partial<ConversationHandlers> }) {
  return (
    <DeviceGallery>
      <EntityResolverProvider resolver={demoResolver}>
        <ConversationHandlersProvider handlers={{ ...HANDLERS, ...handlers }}>{children}</ConversationHandlersProvider>
      </EntityResolverProvider>
    </DeviceGallery>
  )
}

/** A lab cell's content: a column that scrolls inside the box, like a conversation does. */
export function LabScroll({ children }: { children: ReactNode }) {
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be keyboard scrollable (R20.6)
    <div className="ai-lab-scroll" data-scroll-container tabIndex={0} role="region" aria-label="Lab content">
      {children}
    </div>
  )
}

/** Related assistant layout documentation, usable in any gallery host. */
export function TemplateLinks() {
  return <a className="glass-control fa-pressable ai-template-link" href="https://dastari.github.io/glass-ux/components/assistant-pane/"><IconPopOut />Assistant layouts and API</a>
}

/** A fixed-width column for "docked width" specimens (the assistant pane is ≤ 26rem). */
export function DockedColumn({ children }: { children: ReactNode }) {
  return <div className="ai-docked-column">{children}</div>
}
