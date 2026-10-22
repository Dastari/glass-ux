import type {} from "./runtime.js";
// Hydration of a page under AppearanceProvider. The markup is rendered to a string in the page
// (as a server would), then hydrated; window.__hydration reports the long tasks and how often
// appearance consumers rendered. ?stored=1 stores non-default preferences first.
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { AppearanceProvider, useAppearance } from "glass-ux/appearance";
import { Button } from "glass-ux/button";
import { TooltipProvider } from "glass-ux/tooltip";
import { Panel, PanelBody, PanelHeader } from "glass-ux/surface";
import { IconSettings } from "glass-ux/icons";
import "glass-ux/styles.css";

const params = new URLSearchParams(location.search);
localStorage.clear();
if (params.has("stored"))
  localStorage.setItem(
    "glass-ux.appearance.v1",
    JSON.stringify({ density: "compact" }),
  );
const counts = { consumers: 0 };

function Consumer({ index }: { index: number }) {
  const { resolvedMode } = useAppearance();
  counts.consumers += 1;
  return (
    <span data-index={index} data-mode-seen={resolvedMode}>
      Sample {index}
    </span>
  );
}

function Page() {
  return (
    <AppearanceProvider>
      <TooltipProvider>
        <Panel>
          <PanelHeader title="Sample settings" />
          <PanelBody>
            {Array.from({ length: 40 }, (_, i) => (
              <Consumer key={i} index={i} />
            ))}
            {Array.from({ length: 200 }, (_, i) => (
              <Button
                key={i}
                size="sm"
                variant="ghost"
                icon={<IconSettings />}
                aria-label={`Sample action ${i}`}
              />
            ))}
          </PanelBody>
        </Panel>
      </TooltipProvider>
    </AppearanceProvider>
  );
}

const root = document.getElementById("root")!;
root.innerHTML = renderToString(<Page />);
counts.consumers = 0;
const tasks: number[] = [];
// Hydrate in a task of its own, so the in-page "server" render is not counted.
setTimeout(hydrate, 100);
function hydrate() {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      tasks.push(Math.round(entry.duration));
  }).observe({ type: "longtask" });
  const start = performance.now();
  hydrateRoot(root, <Page />, {
    onRecoverableError: (error) => console.error("RECOVERABLE", error),
  });
  // Settle: wait until the document reports hydration (AppearanceProvider's effect) and two frames pass.
  const wait = () =>
    document.documentElement.dataset.hydrated !== undefined
      ? requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            setTimeout(() => {
              window.__hydration = {
                ms: performance.now() - start,
                longTasks: tasks,
                consumerRenders: counts.consumers,
              };
              window.__ready = true;
            }, 50),
          ),
        )
      : requestAnimationFrame(wait);
  wait();
}
