import type {} from "./runtime.js";
import { createRoot } from "react-dom/client";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "glass-ux/tooltip";
import "glass-ux/styles.css";
const params = new URLSearchParams(location.search);
const kind = params.get("kind") ?? "line";
const count = Number(params.get("rows") ?? 10000);
document.documentElement.dataset.glass = params.get("glass") ?? "full";
document.body.style.cssText = "margin:0;height:100vh;overflow:hidden";
document.getElementById("root")!.style.cssText =
  "height:100%;padding:16px;box-sizing:border-box;overflow:auto";
const values = Array.from(
  { length: count },
  (_, i) => Math.sin(i / 20) * 30 + 50,
);
let content: ReactNode;
if (kind === "line" || kind === "scatter") {
  const { LineChart, ScatterChart } = await import("glass-ux/charts");
  content =
    kind === "line" ? (
      <LineChart
        label="Sample readings"
        x={values.map((_, i) => i)}
        series={[{ key: "a", label: "Reading", data: values }]}
      />
    ) : (
      <ScatterChart
        label="Sample readings"
        series={[
          {
            key: "a",
            label: "Reading",
            points: values.map((y, x) => ({ x, y })),
          },
        ]}
        x={{ label: "Sample" }}
        y={{ label: "Reading" }}
      />
    );
} else if (kind === "topology") {
  const { TopologyCanvas } = await import("glass-ux/topology");
  content = (
    <TopologyCanvas
      label="Sample topology"
      nodes={values.map((_, i) => ({
        id: String(i),
        parentId: i === 0 ? null : String(Math.floor((i - 1) / 10)),
        label: `Node ${i}`,
        cluster: "sample",
        data: i,
      }))}
      clusters={{ sample: { label: "Samples" } }}
      renderNode={(node) => <span>{node.label}</span>}
    />
  );
} else if (kind === "command") {
  const { CommandPanel } = await import("glass-ux/command-palette");
  content = (
    <CommandPanel
      onRun={command => command.run()}
      commands={values.map((_, i) => ({
        id: String(i),
        label: `Command ${i}`,
        group: "Samples",
        run() {},
      }))}
    />
  );
} else if (kind === "combobox" || kind === "multi-select") {
  const options = values.map((_, i) => ({
    value: String(i),
    label: `Option ${i}`,
  }));
  if (kind === "combobox") {
    const { Combobox } = await import("glass-ux/combobox");
    content = <Combobox aria-label="Samples" options={options} />;
  } else {
    const { MultiSelect } = await import("glass-ux/multi-select");
    content = <MultiSelect aria-label="Samples" options={options} />;
  }
} else if (kind === "conversation") {
  const { ConversationLog } = await import("glass-ux/ai/conversation");
  const { Markdown } = await import("../../dist/ai/markdown/index.js");
  const initial = values
    .map((_, i) => `Paragraph ${i}: sample **reading** ${i}.`)
    .join("\n\n");
  function Transcript() {
    const [text, setText] = useState(initial);
    window.__append = () => setText((current) => `${current} another token`);
    return (
      <ConversationLog>
        <Markdown text={text} streaming />
      </ConversationLog>
    );
  }
  content = <Transcript />;
} else if (kind === "feed") {
  const { ActivityFeed } = await import("glass-ux/activity-feed");
  content = (
    <ActivityFeed
      items={values.map((_, i) => ({
        id: String(i),
        content: `Sample event ${i}`,
        at: 1700000000000 + i * 1000,
      }))}
    />
  );
} else {
  const { RichTextInput } = await import("glass-ux/rich-text");
  content = (
    <RichTextInput
      aria-label="Notes"
      defaultValue={values.map((_, i) => `Sample paragraph ${i}.`).join("\n\n")}
    />
  );
}
function Ready() {
  useLayoutEffect(() => {
    window.__ready = true;
  });
  return <TooltipProvider>{content}</TooltipProvider>;
}
createRoot(document.getElementById("root")!).render(<Ready />);
