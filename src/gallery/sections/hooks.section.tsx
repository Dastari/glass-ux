import { useRef, useState } from "react";
import {
  cameraTransform,
  containCamera,
  useControllable,
  useElementSize,
  useFocusRegions,
  useHotkeys,
  useMediaQuery,
  usePanZoom,
  useUndoStack,
  type PanZoomCamera,
} from "../../hooks/index.js";
import { Button } from "../../ui/button/index.js";
import { Dialog } from "../../ui/dialog/index.js";
import { Textarea } from "../../ui/textarea/index.js";
import { SCENE_IMAGES } from "../fixtures/scenes.js";
import { SectionPage, Specimen } from "../kit.js";

const PLAN = { width: 1280, height: 960 };

/** A fixed picture on a stage: nothing re-renders while it moves. */
function PanZoomDemo() {
  const picture = useRef<HTMLImageElement>(null);
  const [settled, setSettled] = useState<PanZoomCamera>({ x: 0, y: 0, k: 1 });
  const stage = usePanZoom({
    defaultCamera: { x: 0, y: 0, k: 1 },
    minZoom: 0.5,
    maxZoom: 4,
    constrain: (camera, box) => containCamera(camera, PLAN, box),
    onFrame: (camera) => {
      if (picture.current) picture.current.style.transform = cameraTransform(camera);
    },
    onCommit: setSettled,
  });
  return (
    <div className="flex flex-col gap-3" data-testid="pan-zoom">
      <div
        ref={stage.ref}
        role="application"
        aria-label="Sample picture"
        tabIndex={0}
        className="relative h-64 overflow-hidden rounded-tile bg-fill-muted"
      >
        <img
          ref={picture}
          src={SCENE_IMAGES.ridge}
          alt=""
          width={PLAN.width}
          height={PLAN.height}
          draggable={false}
          className="absolute max-w-none origin-top-left select-none"
          style={{ transform: cameraTransform(settled) }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={stage.zoomIn}>
          Zoom in
        </Button>
        <Button size="sm" onClick={stage.zoomOut}>
          Zoom out
        </Button>
        <Button size="sm" onClick={stage.reset}>
          Reset
        </Button>
        <output className="type-caption text-fg-muted" data-numeric data-testid="pan-zoom-camera">
          {`${Math.round(settled.k * 100)}% at ${Math.round(settled.x)}, ${Math.round(settled.y)}`}
        </output>
      </div>
    </div>
  );
}

const WORDS = ["Draft", "Review", "Approved", "Published"];

function UndoDemo() {
  const history = useUndoStack(WORDS[0]!, { limit: 10 });
  const next = WORDS[(WORDS.indexOf(history.value) + 1) % WORDS.length]!;
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="undo-stack">
      <Button size="sm" onClick={() => history.push(next)}>
        Move to {next}
      </Button>
      <Button size="sm" disabled={!history.canUndo} onClick={history.undo}>
        Undo
      </Button>
      <Button size="sm" disabled={!history.canRedo} onClick={history.redo}>
        Redo
      </Button>
      <output className="type-caption text-fg-muted" data-testid="undo-value">
        {`${history.value} · ${history.past.length} back, ${history.future.length} forward`}
      </output>
    </div>
  );
}

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
        title="usePanZoom"
        description="Drag, wheel, pinch, arrow keys, plus, minus and 0. Each frame writes the transform and React state changes only when a gesture ends."
      >
        <PanZoomDemo />
      </Specimen>
      <Specimen
        layout="stack"
        title="useUndoStack"
        description="Past, present and future for one value. Push on commit; pass coalesce to merge a run of small changes into one step."
      >
        <UndoDemo />
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
