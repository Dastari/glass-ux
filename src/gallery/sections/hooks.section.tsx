import { useRef, useState } from "react";
import {
  isRtl,
  readingKey,
  useClipboard,
  useControllable,
  useDebouncedCallback,
  useDebouncedValue,
  useElementSize,
  useHotkeys,
  useMediaQuery,
  useScrollEdges,
} from "../../hooks/index.js";
import { Button } from "../../ui/button/index.js";
import { SectionPage, Specimen } from "../kit.js";

/** A fictional address to copy; the hook confirms for two seconds and reports a refusal. */
function ClipboardDemo() {
  const { copy, copied, error } = useClipboard();
  return (
    <div className="flex items-center gap-3">
      <Button onClick={() => void copy("10.20.4.18")} status={copied ? "success" : error ? "error" : "idle"}>
        Copy 10.20.4.18
      </Button>
      <output className="min-h-6 min-w-24" data-testid="clipboard-state">
        {copied ? "Copied" : error ? "Could not copy" : ""}
      </output>
    </div>
  );
}

/** Typing updates at once; the search runs after 300 ms of quiet. */
function DebounceDemo() {
  const [text, setText] = useState("");
  const [runs, setRuns] = useState(0);
  const query = useDebouncedValue(text, 300);
  const search = useDebouncedCallback(() => setRuns((value) => value + 1), 300);
  return (
    <div className="flex flex-col gap-2">
      <input
        aria-label="Search"
        className="fa-control"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          search();
        }}
      />
      <output className="min-h-6" data-numeric data-testid="debounce-state">
        Query “{query}” · {runs} searches
      </output>
    </div>
  );
}

/** Scroll edges and reading-direction keys on a small scroller. */
function EdgesDemo() {
  const scroller = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(scroller);
  const [last, setLast] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Scroll edges"
        className="fa-focus-room h-24 overflow-y-auto"
        onKeyDown={(event) =>
          setLast(`${event.key} → ${readingKey(event.key, event.currentTarget)}${isRtl(event.currentTarget) ? " (rtl)" : ""}`)
        }
      >
        {Array.from({ length: 12 }, (_, index) => (
          <p key={index}>Line {index + 1}</p>
        ))}
      </div>
      <output className="min-h-6" data-testid="edges-state">
        {edges.top ? "scrolled away from the top" : "at the top"} · {edges.bottom ? "more below" : "at the end"}
        {last ? ` · ${last}` : ""}
      </output>
    </div>
  );
}

export default function HooksSection() {
  const [count, increment] = useControllable<number>(undefined, 0);
  const [shortcuts, setShortcuts] = useState(0);
  const scope = useRef<HTMLDivElement>(null);
  const size = useElementSize(scope);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const keys = useHotkeys(
    "mod+shift+k",
    () => setShortcuts((value) => value + 1),
    { scope },
  );
  return (
    <SectionPage>
      <Specimen
        layout="stack"
        title="Controlled state and scoped shortcuts"
        description="Focus the example and press Mod+Shift+K. Editable controls ignore shortcuts unless allowInInputs is set."
      >
        <div
          ref={scope}
          className="flex flex-col gap-3"
          data-testid="hooks-scope"
        >
          <Button
            onClick={() => increment((value) => value + 1)}
            aria-keyshortcuts={keys}
          >
            Count {count}
          </Button>
          <output className="min-h-6">Shortcuts: {shortcuts}</output>
          <output className="min-h-6">
            {Math.round(size.width)} × {Math.round(size.height)}
          </output>
          <output className="min-h-6">
            Reduced motion: {reduced ? "yes" : "no"}
          </output>
        </div>
      </Specimen>
      <Specimen
        layout="stack"
        title="Clipboard"
        description="useClipboard copies with the Clipboard API, falls back to a hidden textarea where the page has none, and reports a refusal."
      >
        <ClipboardDemo />
      </Specimen>
      <Specimen
        layout="stack"
        title="Debounce"
        description="useDebouncedValue follows a changing value after it pauses; useDebouncedCallback waits for quiet before calling, and offers cancel, flush and pending."
      >
        <DebounceDemo />
      </Specimen>
      <Specimen
        layout="stack"
        title="Scroll edges and reading direction"
        description="useScrollEdges reports which edges have content beyond them. readingKey turns a horizontal arrow into reading order and isRtl reads an element's direction; press an arrow key in the region."
      >
        <EdgesDemo />
      </Specimen>
    </SectionPage>
  );
}
