import type {} from "./runtime.js";
// A long transcript in a bounded ConversationLog. ?turns=N (default 200). window.__mountMs is the
// time to the first commit with layout; window.__fixture.scrollUp() scrolls the log up in steps
// and reports how far the reading position moved when off-screen turns rendered.
import { createRoot } from "react-dom/client";
import { useLayoutEffect } from "react";
import { AssistantMessage, Turn, UserMessage } from "glass-ux/ai/message";
import { ConversationLog } from "glass-ux/ai/conversation";
import "glass-ux/styles.css";

const params = new URLSearchParams(location.search);
const count = Number(params.get("turns") ?? 200);
const NOW = Date.UTC(2026, 9, 1, 10);
const prose = (i: number) =>
  Array.from(
    { length: 1 + (i % 5) },
    (_, p) =>
      `Sample paragraph ${p + 1} of answer ${i}: the fictional studio queue has ${i % 17} waiting jobs and ${i % 7} printers online.`,
  ).join("\n\n");

function Transcript() {
  return (
    <ConversationLog
      surface="panel"
      label="Sample transcript"
      turns={Array.from({ length: count }, (_, i) => ({
        index: i + 1,
        preview: `Sample question ${i + 1}`,
      }))}
    >
      {Array.from({ length: count }, (_, i) => (
        <Turn key={i} index={i + 1}>
          <UserMessage
            message={{
              id: `u${i}`,
              role: "user",
              createdAt: NOW + i * 60000,
              state: "complete",
              blocks: [{ kind: "markdown", text: `Sample question ${i + 1}` }],
            }}
          />
          <AssistantMessage
            message={{
              id: `a${i}`,
              role: "assistant",
              createdAt: NOW + i * 60000 + 5000,
              state: "complete",
              blocks: [{ kind: "markdown", text: prose(i) }],
            }}
          />
        </Turn>
      ))}
    </ConversationLog>
  );
}

function Ready({ start }: { start: number }) {
  useLayoutEffect(() => {
    void document.body.offsetHeight;
    window.__mountMs = performance.now() - start;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => (window.__ready = true)),
    );
  }, [start]);
  return null;
}

window.__fixture = {
  ...window.__fixture,
  scrollUp: async () => {
    const scroller = document.querySelector<HTMLElement>(
      ".fa-ai-conversation-scroll",
    )!;
    const frame = () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    let worst = 0;
    for (let step = 0; step < 40; step += 1) {
      scroller.scrollTop -= 600;
      await frame();
      // The turn at the top of the view must stay where it is while turns around it render.
      const top = scroller.getBoundingClientRect().top;
      const anchor = [
        ...scroller.querySelectorAll<HTMLElement>(".fa-ai-turn"),
      ].find((t) => t.getBoundingClientRect().bottom > top + 10)!;
      const before = anchor.getBoundingClientRect().top;
      await frame();
      await frame();
      worst = Math.max(
        worst,
        Math.abs(anchor.getBoundingClientRect().top - before),
      );
    }
    return worst;
  },
  // Jump with the turn navigator; report how far from the scroll margin the turn landed.
  jump: async (index: number) => {
    const scroller = document.querySelector<HTMLElement>(
      ".fa-ai-conversation-scroll",
    )!;
    document
      .querySelectorAll<HTMLElement>(".fa-ai-turn-dash")
      [index - 1]!.click();
    await new Promise((r) => setTimeout(r, 2500));
    const turn = scroller.querySelector<HTMLElement>(`[data-turn="${index}"]`)!;
    return Math.round(
      turn.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
    );
  },
} as typeof window.__fixture;

const start = performance.now();
createRoot(document.getElementById("root")!).render(
  <>
    <Transcript />
    <Ready start={start} />
  </>,
);
