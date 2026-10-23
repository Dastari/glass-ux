import type {} from "./runtime.js";
// A reader at the end of a short ConversationLog while an answer streams, as an application's
// scripted assistant drives it: send, a running tool call, the answer word by word (28 ms), then
// completion (footer actions). An earlier answer also grows on its own (work beside a pending
// approval). window.__fixture.send() runs it and resolves with the worst distance from the end
// seen in any frame, the distance after completion, and whether "New messages" ever showed.
import { createRoot } from "react-dom/client";
import { useCallback, useLayoutEffect, useState } from "react";
import { AssistantMessage, Turn, UserMessage } from "glass-ux/ai/message";
import { ConversationLog } from "glass-ux/ai/conversation";
import { Composer } from "glass-ux/ai/composer";
import type { AiMessage, RunState } from "glass-ux/ai";
import "glass-ux/styles.css";

const NOW = Date.UTC(2026, 9, 1, 10);
const ANSWER =
  "The sample printer has been online since **10:12 am** and its print queue is empty. Two documents printed on the Level 2 printer in the last ten minutes; both completed.\n\n- The print spooler has not stopped since the restart\n- The driver is still `4.2.1`; the fix is in `4.3.0`\n\nI can update the driver tonight after 6 pm, once the studio has signed out.";
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const message = (id: string, role: "user" | "assistant", text: string, extra: Partial<AiMessage> = {}): AiMessage =>
  ({ id, role, createdAt: NOW, state: "complete", blocks: [{ kind: "markdown", text }], ...extra }) as AiMessage;

interface Item {
  index: number;
  user: AiMessage;
  reply: AiMessage;
}

const INITIAL: Item[] = [1, 2, 3].map((index) => ({
  index,
  user: message(`u${index}`, "user", `Sample question ${index} about the studio printers?`),
  reply: message(
    `a${index}`,
    "assistant",
    Array.from({ length: 3 }, (_, p) => `Sample paragraph ${p + 1}: the fictional studio queue has ${index + p} waiting jobs and two printers online.`).join("\n\n"),
  ),
}));

let send: (() => Promise<void>) | null = null;

function Conversation() {
  const [items, setItems] = useState(INITIAL);
  const [run, setRun] = useState<RunState>("idle");
  const update = useCallback((id: string, change: (message: AiMessage) => AiMessage) => {
    setItems((current) => current.map((item) => (item.reply.id === id ? { ...item, reply: change(item.reply) } : item)));
  }, []);
  // An earlier answer grows on its own, as work beside a pending approval does.
  useLayoutEffect(() => {
    const grow = (ms: number, text: string) =>
      setTimeout(() => update("a3", (reply) => ({ ...reply, blocks: [...reply.blocks, { kind: "markdown", text }] })), ms);
    const timers = [grow(1200, "Checking the Level 2 printer's queue and toner."), grow(3800, "While you decide: the Level 2 printer is online and toner is at 64 %.")];
    return () => timers.forEach(clearTimeout);
  }, [update]);

  send = async () => {
    const id = "live";
    setRun("sending");
    await wait(250);
    setItems((current) => [
      ...current,
      { index: current.length + 1, user: message("live-q", "user", "Is the queue empty?"), reply: { id, role: "assistant", createdAt: NOW, state: "streaming", blocks: [] } as AiMessage },
    ]);
    setRun("running");
    await wait(500);
    update(id, (reply) => ({ ...reply, blocks: [{ kind: "tools", calls: [{ id: "t", toolId: "sample.query", label: "Read the printer's status", activeLabel: "Reading the printer's status", status: "running" }] }] }));
    await wait(1400);
    update(id, (reply) => ({ ...reply, blocks: [{ kind: "tools", calls: [{ id: "t", toolId: "sample.query", label: "Read the printer's status", status: "succeeded", elapsedMs: 1380 }] }, { kind: "markdown", text: "" }] }));
    let shown = "";
    for (const word of ANSWER.split(/(?<=\s)/)) {
      shown += word;
      const partial = shown;
      update(id, (reply) => ({ ...reply, blocks: reply.blocks.map((block) => (block.kind === "markdown" ? { kind: "markdown", text: partial } : block)) }));
      await wait(28);
    }
    update(id, (reply) => ({ ...reply, state: "complete" }));
    setRun("idle");
  };

  return (
    <ConversationLog
      surface="panel"
      label="Sample conversation"
      footer={<Composer aria-label="Message the assistant" run={run} onSend={() => void send?.()} onStop={() => undefined} />}
    >
      {items.map((item, position) => (
        <Turn key={item.index} index={item.index}>
          <UserMessage message={item.user} />
          <AssistantMessage message={item.reply} latest={position === items.length - 1} />
        </Turn>
      ))}
    </ConversationLog>
  );
}

function Ready() {
  useLayoutEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => (window.__ready = true)));
  }, []);
  return null;
}

window.__fixture = {
  ...window.__fixture,
  send: async () => {
    const scroller = document.querySelector<HTMLElement>(".fa-ai-conversation-scroll")!;
    const pill = () => document.querySelector(".fa-ai-new-pill[data-visible]") !== null;
    const gap = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    let worst = 0;
    let pillSeen = false;
    // Sampled in a ResizeObserver created after the log's own: observers report in creation
    // order, so this sees each frame after the log has followed the growth, as it is painted.
    const sample = () => {
      worst = Math.max(worst, gap());
      pillSeen ||= pill();
    };
    const observer = new ResizeObserver(sample);
    for (const element of [scroller, scroller.firstElementChild!, document.querySelector(".fa-ai-conversation-float")!]) observer.observe(element);

    await send!();
    // Let the completion lay out, as a test waiting for the final text would.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await wait(100);
    observer.disconnect();
    return { worst: Math.round(worst), final: Math.round(gap()), pill: pillSeen || pill() };
  },
};

createRoot(document.getElementById("root")!).render(
  <>
    <Conversation />
    <Ready />
  </>,
);
