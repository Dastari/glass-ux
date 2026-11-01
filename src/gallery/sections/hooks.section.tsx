import { useRef, useState } from "react";
import {
  useControllable,
  useElementSize,
  useFocusRegions,
  useHotkeys,
  useMediaQuery,
} from "../../hooks/index.js";
import { Button } from "../../ui/button/index.js";
import { Dialog } from "../../ui/dialog/index.js";
import { Textarea } from "../../ui/textarea/index.js";
import { SectionPage, Specimen } from "../kit.js";

function FocusRegions() {
  const scope = useRef<HTMLDivElement>(null);
  const keys = useFocusRegions({ scope });
  return (
    <div ref={scope} className="gallery-regions" data-testid="focus-regions">
      <nav data-focus-region aria-label="Plans" className="gallery-region">
        <Button size="sm" aria-keyshortcuts={keys}>Floor plans</Button>
        <Button size="sm">Elevations</Button>
      </nav>
      <section data-focus-region aria-label="Notes" className="gallery-region">
        <Textarea aria-label="Handover notes" defaultValue="Tab stays in the page; F6 leaves this field." />
      </section>
      <section data-focus-region aria-label="Summary" className="gallery-region">
        <p>Three rooms, 42 reservations.</p>
      </section>
      <section data-focus-region aria-label="Hidden pane" className="gallery-region" inert>
        <p>Inert, so F6 passes it.</p>
      </section>
      <section data-focus-region aria-label="Actions" className="gallery-region">
        <Dialog.Root>
          <Dialog.Trigger render={<Button size="sm">Open a dialog</Button>} />
          <Dialog.Popup>
            <Dialog.Header title="Modal dialog" />
            <Dialog.Body>F6 is not used while this is open.</Dialog.Body>
            <Dialog.Footer>
              <Dialog.Close render={<Button size="sm">Done</Button>} />
            </Dialog.Footer>
          </Dialog.Popup>
        </Dialog.Root>
      </section>
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
        title="Focus regions"
        description="Focus inside the example and press F6 or Shift+F6. Focus goes round the regions, skips the inert one and returns to where it last was."
      >
        <FocusRegions />
      </Specimen>
    </SectionPage>
  );
}
