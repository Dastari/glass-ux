import { useRef, useState } from "react";
import {
  useControllable,
  useElementSize,
  useHotkeys,
  useMediaQuery,
} from "../../hooks/index.js";
import { Button } from "../../ui/button/index.js";
import { SectionPage, Specimen } from "../kit.js";

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
    </SectionPage>
  );
}
