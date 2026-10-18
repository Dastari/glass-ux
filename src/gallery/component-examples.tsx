import {
  IdentityCell,
  TextCell,
  TwoLineCell,
  NumericCell,
  RelativeTime,
  SparklineCell,
} from "../ui/data-table/index.js";
import {
  EntityResolverProvider,
  EntityChip,
  ConversationHandlersProvider,
} from "../ai/index.js";
import { demoResolver } from "./sections/ai.fixtures.js";
import { ActionMenu, ActionProvider } from "../ui/actions/index.js";
import { ConfirmHost, confirm } from "../ui/alert-dialog/index.js";
import { Toaster } from "../ui/toast/index.js";
import {
  PaletteProvider,
  useCommandPalette,
  usePaletteCommands,
} from "../ui/command-palette/index.js";
import {
  Panel,
  Surface,
  PanelHeader,
  PanelBody,
  PanelFooter,
} from "../ui/surface/index.js";
const SAMPLE_ACTIONS = defineActions<{ id: string }>("exhibitions", [
  {
    id: "open",
    label: "Open exhibition",
    group: "open",
    run: (_targets, context) => context.navigate("#sample-exhibition"),
  },
]);
import { HitLayer } from "../ui/charts/index.js";
import { defineActions, resolveActions } from "../lib/actions/actions.js";
import { Dialog } from "../ui/dialog/index.js";
import { useState, useRef } from "react";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { ContainerLab, Example, SectionPage, Specimen } from "./kit.js";
import { PORTRAITS } from "./fixtures/organisations.js";
import { Avatar } from "../ui/avatar/index.js";
import { AiGallery } from "./sections/ai.kit.js";
import { ASKS, RESULTS, E, NOW, SOURCES } from "./sections/ai.fixtures.js";
import { DEMO_MAP_CONFIG } from "./fixtures/map.js";
import {
  IconSparkle,
  IconSearch,
  IconOrganisation,
  IconBell,
  IconUser,
} from "../icons/generated/icons.js";
import { toast } from "../ui/toast/index.js";
const CHOICES = [
  { value: "meridian", label: "Meridian exhibition" },
  { value: "cedar", label: "Cedar design workshop" },
];
import {
  AppShell,
  AccountButton,
  Inspector,
  InspectorToggle,
  Rail,
  ShellBrand,
  ShortcutKeys,
  ThemeToggle,
  TimerChip,
  TopBar,
} from "../shell/index.js";
import {
  PopoutWindow,
  Window,
  WindowBodySkeleton,
  WindowContentHost,
  WindowFrame,
  WindowManagerProvider,
  WindowSwitcher,
  createWindowManager,
  registerWindowKind,
} from "../windows/index.js";
import {
  AiCard,
  AiMark,
  AiSurfaceProvider,
  AskCard,
  AskDock,
  AskDockProvider,
  AskLayout,
  AskRecord,
  AskShell,
  AttachmentChip,
  CitationMarker,
  ClarifyAsk,
  ConfirmAsk,
  DateTimeAsk,
  EntityGlyph,
  EntityOptionList,
  EntityPickerAsk,
  EntityPreviewContent,
  EntityQuickActions,
  EntityStateBadge,
  FileGlyph,
  FileRowItem,
  FormAsk,
  ImageLightbox,
  ImageTile,
  InlineCode,
  JsonTree,
  Markdown,
  MessageBlocks,
  MultiChoiceAsk,
  QuickRepliesAsk,
  RankAsk,
  Redacted,
  ResultChart,
  ResultDetail,
  ResultDiff,
  ResultEntities,
  ResultEntity,
  ResultFiles,
  ResultFrame,
  ResultImages,
  ResultJson,
  ResultLog,
  ResultMetrics,
  ResultTable,
  ResultValue,
  SessionNavSkeleton,
  SingleChoiceAsk,
  SourceList,
  SourcesProvider,
  StatusGlyph,
  TurnNavigator,
  UserMessage,
} from "../ai/index.js";
import { Input, InputSkeleton, NormalisedInput } from "../ui/input/index.js";
import { Menu, MenuItemContent, MenuPreview } from "../ui/menu/index.js";
import { TextareaSkeleton } from "../ui/textarea/index.js";
import { EntityIdentitySkeleton } from "../ui/entity/index.js";
import {
  Tooltip,
  TooltipPopup,
  TooltipPrimitive,
  TooltipProvider,
} from "../ui/tooltip/index.js";
import { ActionMenuItems } from "../ui/actions/index.js";
import {
  ChartFrame,
  ChartLegend,
  ChartTable,
  ChartTooltip,
  DrillPathBar,
  PlotSkeleton,
  ProportionStrip,
  Swatch,
  TooltipBody,
  useHierarchy,
  useHoverStore,
} from "../ui/charts/index.js";
import { Button } from "../ui/button/index.js";
import { ToastLayout } from "../ui/toast/index.js";
import { ChoiceRow, Field, Fieldset } from "../ui/field/index.js";
import { SparklineSkeleton } from "../ui/sparkline/index.js";
import { AppearanceProvider } from "../lib/appearance/index.js";
import { MapSilhouette, PinMap } from "../ui/map/index.js";
import {
  ChipMeasure,
  ComboboxPopup,
  Highlight,
  OptionChip,
  OptionMore,
  OptionRow,
  OptionStatus,
} from "../ui/combobox/index.js";
import { TabNav } from "../ui/tabs/index.js";
import { ContextMenu } from "../ui/context-menu/index.js";
import { SwatchPicker } from "../ui/swatch-picker/index.js";
import { DialogSurface } from "../ui/dialog/index.js";
import { VerticalTabNav } from "../ui/vertical-tabs/index.js";
import { PrivilegedMark } from "../ui/entity-settings/index.js";
import { TopologyCanvasSkeleton } from "../ui/topology/index.js";
import { Checkbox } from "../ui/checkbox/index.js";

function SampleWindowBody() {
  return (
    <Window.Body>
      <p>Fictional exhibition notes.</p>
    </Window.Body>
  );
}
function makeWindowDemo() {
  registerWindowKind({
    kind: "docs.notes",
    icon: IconOrganisation,
    title: () => "Exhibition notes",
    load: async () => ({ default: SampleWindowBody }),
  });
  const manager = createWindowManager({ storageKey: null, channelName: null });
  const id = manager.open({ kind: "docs.notes", params: {} });
  return { manager, id };
}

export function HighlightExample() {
  const [query, setQuery] = useState("cafe");
  return (
    <SectionPage>
      <Specimen
        title="Search matches"
        description="Edit the query. Matching text is emphasised without changing the original spelling; case and accents are ignored."
        layout="stack"
      >
        <Field label="Search text">
          <Input value={query} onValueChange={setQuery} />
        </Field>
        <p>
          <Highlight text="Café Meridian — creative workspace" query={query} />
        </p>
        <p>
          <Highlight
            text="CAFETERIA — lower case queries also match"
            query={query}
          />
        </p>
        <p>
          <Highlight text="No matching text stays unchanged" query={query} />
        </p>
      </Specimen>
    </SectionPage>
  );
}

export function AiCardExample() {
  return (
    <SectionPage>
      <Specimen
        title="AiCard"
        description="Compose the header, body and footer. The card reads its material from AiSurfaceProvider."
        layout="stack"
      >
        <AiCard.Root>
          <AiCard.Header
            icon={<IconSparkle />}
            title="Research summary"
            meta="3 sources reviewed"
          />
          <AiCard.Body>
            A fictional studio is planning its next exhibition.
          </AiCard.Body>
          <AiCard.Footer>
            <Button>Review sources</Button>
          </AiCard.Footer>
        </AiCard.Root>
      </Specimen>
    </SectionPage>
  );
}

export function AiMarkExample() {
  return (
    <SectionPage>
      <Specimen
        title="AiMark"
        description="The shared assistant identity mark."
        layout="stack"
      >
        <AiMark />
        <AiMark size="lg" />
      </Specimen>
    </SectionPage>
  );
}

export function AiSurfaceProviderExample() {
  return (
    <SectionPage>
      <Specimen title="AiSurfaceProvider" layout="stack">
        <AiSurfaceProvider surface="canvas">
          <AiCard.Root>
            <AiCard.Header title="On the canvas" />
            <AiCard.Body>Panel material is chosen by the provider.</AiCard.Body>
          </AiCard.Root>
        </AiSurfaceProvider>
        <AiSurfaceProvider surface="panel">
          <AiCard.Root>
            <AiCard.Header title="Inside a panel" />
            <AiCard.Body>Control material avoids nested panels.</AiCard.Body>
          </AiCard.Root>
        </AiSurfaceProvider>
      </Specimen>
    </SectionPage>
  );
}

export function AppearanceProviderExample() {
  return (
    <SectionPage>
      <Specimen
        title="AppearanceProvider"
        description="Mount once at the application root. The theme control updates the persisted appearance and document tokens."
        layout="stack"
      >
        <AppearanceProvider>
          <ThemeToggle />
          <SwatchPicker
            options={[
              { value: "ocean", label: "Ocean", palette: "ocean" },
              { value: "aurora", label: "Aurora", palette: "aurora" },
            ]}
            defaultValue="ocean"
            aria-label="Sample palette"
          />
        </AppearanceProvider>
      </Specimen>
    </SectionPage>
  );
}

export function AskDockExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="Pending questions above the composer" layout="stack">
          <AskDockProvider>
            <AskCard ask={ASKS.single} />
            <AskCard ask={ASKS.quick} />
            <AskDock />
          </AskDockProvider>
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function AskDockProviderExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="Shared pending-question state" layout="stack">
          <AskDockProvider>
            <AskCard ask={ASKS.single} />
            <AskCard ask={ASKS.multi} />
            <AskDock />
          </AskDockProvider>
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function AskLayoutExample() {
  return (
    <SectionPage>
      <Specimen title="AskLayout" layout="stack">
        <AskLayout
          id="sample-question"
          icon={<IconSparkle />}
          tone="accent"
          title="Continue with the exhibition plan?"
          meta="Northstar Studio"
          footer={<Button>Continue</Button>}
        >
          Review the proposed schedule before continuing.
        </AskLayout>
      </Specimen>
    </SectionPage>
  );
}

export function AskRecordExample() {
  return (
    <SectionPage>
      <Specimen title="AskRecord" layout="stack">
        <AskRecord status="succeeded" by="Avery Quinn" at={NOW}>
          Selected the morning session.
        </AskRecord>
        <AskRecord status="cancelled">Skipped the optional question.</AskRecord>
      </Specimen>
    </SectionPage>
  );
}

export function AskShellExample() {
  const [resolved, setResolved] = useState(false);
  return (
    <SectionPage>
      <Specimen title="Fold an answered question into a record" layout="stack">
        <AskShell
          resolved={resolved}
          record={
            <AskRecord status="succeeded">Confirmed the schedule.</AskRecord>
          }
        >
          <AskLayout
            id="fold-question"
            title="Confirm the schedule?"
            icon={<IconSparkle />}
            tone="accent"
            footer={<Button onClick={() => setResolved(true)}>Confirm</Button>}
          >
            The session starts at 9 am.
          </AskLayout>
        </AskShell>
        <Button variant="ghost" onClick={() => setResolved(false)}>
          Reset
        </Button>
      </Specimen>
    </SectionPage>
  );
}

export function SingleChoiceAskExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="SingleChoiceAsk"
          description="A working question with fictional data. Answer it to see the resolved record; application handlers receive the decision."
          layout="stack"
        >
          <SingleChoiceAsk ask={ASKS.single} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function MultiChoiceAskExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="MultiChoiceAsk"
          description="A working question with fictional data. Answer it to see the resolved record; application handlers receive the decision."
          layout="stack"
        >
          <MultiChoiceAsk ask={ASKS.multi} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function QuickRepliesAskExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="QuickRepliesAsk"
          description="A working question with fictional data. Answer it to see the resolved record; application handlers receive the decision."
          layout="stack"
        >
          <QuickRepliesAsk ask={ASKS.quick} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function FormAskExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="FormAsk"
          description="A working question with fictional data. Answer it to see the resolved record; application handlers receive the decision."
          layout="stack"
        >
          <FormAsk ask={ASKS.form} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function EntityPickerAskExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="EntityPickerAsk"
          description="A working question with fictional data. Answer it to see the resolved record; application handlers receive the decision."
          layout="stack"
        >
          <EntityPickerAsk ask={ASKS.entity} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function DateTimeAskExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="DateTimeAsk"
          description="A working question with fictional data. Answer it to see the resolved record; application handlers receive the decision."
          layout="stack"
        >
          <DateTimeAsk ask={ASKS.datetime} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ConfirmAskExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ConfirmAsk"
          description="A working question with fictional data. Answer it to see the resolved record; application handlers receive the decision."
          layout="stack"
        >
          <ConfirmAsk ask={ASKS.confirm} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function RankAskExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="RankAsk"
          description="A working question with fictional data. Answer it to see the resolved record; application handlers receive the decision."
          layout="stack"
        >
          <RankAsk ask={ASKS.rank} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ClarifyAskExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ClarifyAsk"
          description="A working question with fictional data. Answer it to see the resolved record; application handlers receive the decision."
          layout="stack"
        >
          <ClarifyAsk ask={ASKS.clarify} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function AttachmentChipExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="AttachmentChip" layout="stack">
          <AttachmentChip
            attachment={{
              id: "brief",
              name: "exhibition-brief.pdf",
              size: 240000,
              mime: "application/pdf",
              state: "ready",
            }}
          />
          <AttachmentChip
            attachment={{
              id: "draft",
              name: "draft.csv",
              size: 42000,
              state: "uploading",
              progress: 0.6,
            }}
          />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ChartFrameExample() {
  return (
    <SectionPage>
      <Specimen title="ChartFrame" layout="stack">
        <div className="h-90 w-full">
          <ChartFrame
            kind="column"
            label="Custom plot of weekly reservations"
            title="Weekly reservations"
          >
            {({ width, height }) => (
              <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label="Three weekly reservation totals"
              >
                {[40, 65, 80].map((value, i) => (
                  <rect
                    key={i}
                    x={(width * (i + 0.1)) / 3}
                    y={height * (1 - value / 100)}
                    width={width / 5}
                    height={(height * value) / 100}
                    fill="var(--chart-1)"
                  />
                ))}
              </svg>
            )}
          </ChartFrame>
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function ChartLegendExample() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  return (
    <SectionPage>
      <Specimen title="Toggle series with the pointer or keyboard">
        <ChartLegend
          items={[
            { key: "booked", label: "Booked", slot: 1, shape: "line" },
            { key: "available", label: "Available", slot: 2, shape: "line" },
          ]}
          hidden={hidden}
          onToggle={(key) =>
            setHidden((current) => {
              const next = new Set(current);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            })
          }
        />
      </Specimen>
    </SectionPage>
  );
}

export function ChartTableExample() {
  return (
    <SectionPage>
      <Specimen title="ChartTable" layout="stack">
        <div className="h-60 w-full">
          <ChartTable
            visible
            caption="Weekly reservations"
            model={{
              columns: [
                { key: "week", label: "Week" },
                { key: "count", label: "Reservations", numeric: true },
              ],
              rows: [
                { week: "Week 1", count: "42" },
                { week: "Week 2", count: "58" },
              ],
            }}
          />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function ChartTooltipExample() {
  const anchor = useRef<HTMLDivElement>(null);
  const store = useHoverStore();
  return (
    <SectionPage>
      <Specimen
        title="Plot readout"
        description="Hover the stage or focus the button to open the chart tooltip."
        layout="stack"
      >
        <div
          ref={anchor}
          className="relative h-45 w-full"
          onPointerMove={(event) =>
            store.set({
              index: 0,
              x: event.clientX,
              y: event.clientY,
              via: "pointer",
            })
          }
          onPointerLeave={() => store.set(null)}
        >
          <Button
            onFocus={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              store.set({
                index: 0,
                x: box.left,
                y: box.bottom,
                via: "keyboard",
              });
            }}
            onBlur={() => store.set(null)}
          >
            Week 1 · 42 reservations
          </Button>
        </div>
        <ChartTooltip anchor={anchor} store={store}>
          {() => (
            <TooltipBody
              title="Week 1"
              rows={[
                { key: "booked", label: "Reservations", value: "42", slot: 1 },
              ]}
            />
          )}
        </ChartTooltip>
      </Specimen>
    </SectionPage>
  );
}

export function ChipMeasureExample() {
  return (
    <SectionPage>
      <Specimen title="ChipMeasure" layout="stack">
        <div className="fa-chip-measure-example" aria-hidden="true">
          <ChipMeasure label="Northstar" />
        </div>
        <p>
          The hidden measuring twin is used by chip containers to decide how
          many values fit. It is not an interactive chip.
        </p>
      </Specimen>
    </SectionPage>
  );
}

export function ChoiceRowExample() {
  return (
    <SectionPage>
      <Specimen title="ChoiceRow" layout="stack">
        <ChoiceRow
          controlId="sample-consent"
          label="Send an exhibition reminder"
          description="One message on the morning of the event."
        >
          <Checkbox id="sample-consent" />
        </ChoiceRow>
      </Specimen>
    </SectionPage>
  );
}

export function CitationMarkerExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="CitationMarker" layout="stack">
          <SourcesProvider sources={SOURCES}>
            <p>
              The sample report includes a source
              <CitationMarker index={1} />.
            </p>
          </SourcesProvider>
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function SourcesProviderExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="SourcesProvider" layout="stack">
          <SourcesProvider sources={SOURCES}>
            <Markdown text="A report with a source citation[^1]." />
            <SourceList sources={SOURCES} />
          </SourcesProvider>
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ComboboxPopupExample() {
  return (
    <SectionPage>
      <Specimen
        title="ComboboxPopup"
        description="Compose the shared popup inside a Base UI combobox root."
        layout="stack"
      >
        <BaseCombobox.Root items={CHOICES}>
          <BaseCombobox.Input
            render={<Input aria-label="Search sample projects" />}
          />
          <ComboboxPopup items={CHOICES} query="" />
        </BaseCombobox.Root>
      </Specimen>
    </SectionPage>
  );
}

export function ContextMenuExample() {
  return (
    <SectionPage>
      <Specimen title="ContextMenu" layout="stack">
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <Button>Right-click or press Shift+F10</Button>
          </ContextMenu.Trigger>
          <ContextMenu.Popup>
            <ContextMenu.Item>Open sample</ContextMenu.Item>
            <ContextMenu.Item>Duplicate sample</ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Root>
      </Specimen>
    </SectionPage>
  );
}

export function DialogSurfaceExample() {
  return (
    <SectionPage>
      <Specimen title="DialogSurface" layout="stack">
        <Dialog.Root>
          <Dialog.Trigger render={<Button>Open dialog surface</Button>} />
          <DialogSurface mode="dialog">
            <Dialog.Header title="Sample dialog" />
            <Dialog.Body>
              Surface owns the backdrop, positioning and accessible popup.
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Close render={<Button>Close</Button>} />
            </Dialog.Footer>
          </DialogSurface>
        </Dialog.Root>
      </Specimen>
    </SectionPage>
  );
}

export function DrillPathBarExample() {
  const root = useHierarchy({
    label: "Studio",
    children: [
      { label: "Rooms", children: [{ label: "Main gallery", value: 42 }] },
    ],
  });
  const [depth, setDepth] = useState(2);
  const trail = [
    root,
    root.children![0]!,
    root.children![0]!.children![0]!,
  ].slice(0, depth + 1);
  return (
    <SectionPage>
      <Specimen title="Navigate a hierarchy" layout="stack">
        <DrillPathBar trail={trail} onSelect={setDepth} />
        <Button variant="ghost" onClick={() => setDepth(2)}>
          Reset path
        </Button>
      </Specimen>
    </SectionPage>
  );
}

export function EntityGlyphExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="EntityGlyph" layout="stack">
          <EntityGlyph entity={E.c106Online} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function EntityPreviewContentExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="EntityPreviewContent" layout="stack">
          <EntityPreviewContent entity={E.c106Online} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function EntityQuickActionsExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="EntityQuickActions" layout="stack">
          <EntityQuickActions entity={E.c106Online} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function EntityStateBadgeExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="EntityStateBadge" layout="stack">
          <EntityStateBadge entity={E.c106Online} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function EntityOptionListExample() {
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<string>();
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="Selectable entity search rows" layout="stack">
          <Input
            aria-label="Search sample entities"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown")
                setActive((value) => Math.min(2, value + 1));
              if (event.key === "ArrowUp")
                setActive((value) => Math.max(0, value - 1));
              if (event.key === "Enter")
                setPicked([E.c106Online, E.northstar, E.mira][active]!.id);
            }}
            aria-controls="sample-entity-list"
          />
          <EntityOptionList
            id="sample-entity-list"
            options={[E.c106Online, E.northstar, E.mira]}
            active={active}
            onActive={setActive}
            selected={(entity) => entity.id === picked}
            onPick={(entity) => setPicked(entity.id)}
          />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function EntityIdentitySkeletonExample() {
  return (
    <SectionPage>
      <Specimen title="EntityIdentitySkeleton" layout="stack">
        <EntityIdentitySkeleton />
      </Specimen>
    </SectionPage>
  );
}

export function FieldsetExample() {
  return (
    <SectionPage>
      <Specimen title="Fieldset" layout="stack">
        <Fieldset legend="Notifications">
          <ChoiceRow controlId="sample-notify" label="Send a reminder">
            <Checkbox id="sample-notify" />
          </ChoiceRow>
        </Fieldset>
      </Specimen>
    </SectionPage>
  );
}

export function FileGlyphExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="FileGlyph" layout="stack">
          <FileGlyph name="exhibition-brief.pdf" mime="application/pdf" />
          <FileGlyph name="reservations.csv" mime="text/csv" />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function FileRowItemExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="FileRowItem" layout="stack">
          <FileRowItem
            file={{
              id: "brief",
              name: "exhibition-brief.pdf",
              size: 240000,
              mime: "application/pdf",
              href: "https://files.northstar.example/brief.pdf",
            }}
          />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ImageLightboxExample() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="Inspect sample images" layout="stack">
          <Button onClick={() => setOpen(true)}>Open image viewer</Button>
          <ImageLightbox
            images={RESULTS.screens.images}
            index={index}
            onIndexChange={setIndex}
            open={open}
            onOpenChange={setOpen}
          />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ImageTileExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="ImageTile" layout="stack">
          <ImageTile image={RESULTS.screen.images[0]!} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function InlineCodeExample() {
  return (
    <SectionPage>
      <Specimen title="InlineCode" layout="stack">
        <p>
          Run <InlineCode>pnpm build</InlineCode> to build the sample project.
        </p>
      </Specimen>
    </SectionPage>
  );
}

export function InputSkeletonExample() {
  return (
    <SectionPage>
      <Specimen
        title="InputSkeleton"
        description="The loading state keeps the corresponding content dimensions while data arrives."
        layout="stack"
      >
        <div className="h-45 w-full">
          <InputSkeleton />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function TextareaSkeletonExample() {
  return (
    <SectionPage>
      <Specimen
        title="TextareaSkeleton"
        description="The loading state keeps the corresponding content dimensions while data arrives."
        layout="stack"
      >
        <div className="h-45 w-full">
          <TextareaSkeleton />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function SparklineSkeletonExample() {
  return (
    <SectionPage>
      <Specimen
        title="SparklineSkeleton"
        description="The loading state keeps the corresponding content dimensions while data arrives."
        layout="stack"
      >
        <div className="h-45 w-full">
          <SparklineSkeleton />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function TopologyCanvasSkeletonExample() {
  return (
    <SectionPage>
      <Specimen
        title="TopologyCanvasSkeleton"
        description="The loading state keeps the corresponding content dimensions while data arrives."
        layout="stack"
      >
        <div className="h-45 w-full">
          <TopologyCanvasSkeleton />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function SessionNavSkeletonExample() {
  return (
    <SectionPage>
      <Specimen
        title="SessionNavSkeleton"
        description="The loading state keeps the corresponding content dimensions while data arrives."
        layout="stack"
      >
        <div className="h-45 w-full">
          <SessionNavSkeleton />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function WindowBodySkeletonExample() {
  return (
    <SectionPage>
      <Specimen
        title="WindowBodySkeleton"
        description="The loading state keeps the corresponding content dimensions while data arrives."
        layout="stack"
      >
        <div className="h-45 w-full">
          <WindowBodySkeleton />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function JsonTreeExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="JsonTree" layout="stack">
          <JsonTree
            label="Sample exhibition configuration"
            value={{
              title: "Meridian",
              rooms: 3,
              access: { public: true },
              tags: ["photography", "sculpture"],
            }}
          />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function MapSilhouetteExample() {
  return (
    <SectionPage>
      <Specimen title="MapSilhouette" layout="stack">
        <div className="h-60 w-full">
          <MapSilhouette
            region={{
              type: "Feature",
              bbox: [140, -42, 145, -37],
              properties: {
                code: "SAMPLE",
                country: "AU",
                name: "Sample region",
                focus: [140, -42, 145, -37],
              },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [140, -42],
                    [145, -42],
                    [145, -37],
                    [140, -37],
                    [140, -42],
                  ],
                ],
              },
            }}
          />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function MenuItemContentExample() {
  return (
    <SectionPage>
      <Specimen title="MenuItemContent" layout="stack">
        <MenuPreview.Surface label="Sample actions">
          <div className="fa-item">
            <MenuItemContent icon={<IconSearch />} shortcut="mod+k">
              Search exhibitions
            </MenuItemContent>
          </div>
        </MenuPreview.Surface>
      </Specimen>
    </SectionPage>
  );
}

export function MessageBlocksExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="MessageBlocks" layout="stack">
          <MessageBlocks
            message={{
              id: "sample-blocks",
              role: "assistant",
              createdAt: NOW,
              state: "complete",
              blocks: [
                { kind: "markdown", text: "Here is the **exhibition plan**." },
                { kind: "result", result: RESULTS.health },
                {
                  kind: "notice",
                  tone: "info",
                  text: "All values are fictional demo data.",
                },
              ],
            }}
          />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function NormalisedInputExample() {
  return (
    <SectionPage>
      <Specimen title="NormalisedInput" layout="stack">
        <Field
          label="Project slug"
          hint="Type spaces or capitals, then leave the field."
        >
          <NormalisedInput
            defaultValue="Meridian Studio"
            normalise={(text) =>
              text.trim().toLowerCase().replaceAll(/\s+/g, "-")
            }
          />
        </Field>
      </Specimen>
    </SectionPage>
  );
}

export function OptionChipExample() {
  return (
    <SectionPage>
      <Specimen
        title="OptionChip"
        description="A read-only chip requires no combobox context. Editable chips belong inside a Base UI Chips collection."
        layout="stack"
      >
        <OptionChip label="Northstar Studio" readOnly />
        <OptionChip
          label="Long sample project name"
          readOnly
          invalid="Archived project"
        />
      </Specimen>
    </SectionPage>
  );
}

export function OptionMoreExample() {
  return (
    <SectionPage>
      <Specimen
        title="OptionMore"
        description="The count prompts people to refine a search that has more matches than the current list."
        layout="stack"
      >
        <OptionMore more={128} />
      </Specimen>
    </SectionPage>
  );
}

export function OptionRowExample() {
  return (
    <SectionPage>
      <Specimen title="OptionRow" layout="stack">
        <div className="fa-item">
          <OptionRow
            item={{
              value: "meridian",
              label: "Meridian Studio",
              description: "Exhibition project",
              meta: "3 rooms",
              icon: <IconOrganisation />,
            }}
            query="studio"
            check
          />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function OptionStatusExample() {
  return (
    <SectionPage>
      <Specimen title="OptionStatus" layout="stack">
        <OptionStatus status="loading" twoLine />
        <OptionStatus
          status="error"
          onRetry={() => toast.info("Demo retry requested")}
        />
        <OptionStatus status="idle" needsMore={2} />
      </Specimen>
    </SectionPage>
  );
}

export function PinMapExample() {
  const [value, setValue] = useState<{ lng: number; lat: number } | null>({
    lng: 147.3,
    lat: -42.8,
  });
  return (
    <SectionPage>
      <Specimen title="Choose a sample location" layout="stack">
        <div className="h-90 w-full">
          <PinMap
            config={DEMO_MAP_CONFIG}
            value={value}
            onValueChange={setValue}
            label="Sample studio location"
          />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function PlotSkeletonExample() {
  return (
    <SectionPage>
      <Specimen title="PlotSkeleton" layout="stack">
        <div className="relative h-60 w-full">
          <PlotSkeleton kind="line" tier="full" />
        </div>
        <div className="relative h-60 w-full">
          <PlotSkeleton kind="column" tier="compact" />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function PrivilegedMarkExample() {
  return (
    <SectionPage>
      <Specimen title="PrivilegedMark" layout="stack">
        <p>
          Restricted project setting <PrivilegedMark />
        </p>
      </Specimen>
    </SectionPage>
  );
}

export function ProportionStripExample() {
  return (
    <SectionPage>
      <Specimen title="ProportionStrip" layout="stack">
        <svg
          viewBox="0 0 480 40"
          role="img"
          aria-label="Booked 60 percent, available 40 percent"
        >
          <ProportionStrip
            width={480}
            height={40}
            rem={16}
            items={[
              { key: "booked", value: 60, slot: 1 },
              { key: "available", value: 40, slot: 2 },
            ]}
          />
        </svg>
      </Specimen>
    </SectionPage>
  );
}

export function RedactedExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="Redacted"
          description="Sensitive content is withheld by the host. The browser receives a typed redaction record instead of the secret."
          layout="stack"
        >
          <Redacted
            value={{ redacted: true, reason: "Restricted demo value" }}
          />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultChartExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ResultChart"
          description="This renderer displays one typed result. The sample is local fictional data; supply your own result and host handlers."
          layout="stack"
        >
          <ResultChart result={RESULTS.latency} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultDetailExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ResultDetail"
          description="This renderer displays one typed result. The sample is local fictional data; supply your own result and host handlers."
          layout="stack"
        >
          <ResultDetail result={RESULTS.network} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultDiffExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ResultDiff"
          description="This renderer displays one typed result. The sample is local fictional data; supply your own result and host handlers."
          layout="stack"
        >
          <ResultDiff result={RESULTS.printerDiff} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultEntitiesExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ResultEntities"
          description="This renderer displays one typed result. The sample is local fictional data; supply your own result and host handlers."
          layout="stack"
        >
          <ResultEntities result={RESULTS.missing} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultEntityExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ResultEntity"
          description="This renderer displays one typed result. The sample is local fictional data; supply your own result and host handlers."
          layout="stack"
        >
          <ResultEntity result={RESULTS.c106} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultFilesExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ResultFiles"
          description="This renderer displays one typed result. The sample is local fictional data; supply your own result and host handlers."
          layout="stack"
        >
          <ResultFiles result={RESULTS.files} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultImagesExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ResultImages"
          description="This renderer displays one typed result. The sample is local fictional data; supply your own result and host handlers."
          layout="stack"
        >
          <ResultImages result={RESULTS.screens} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultLogExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ResultLog"
          description="This renderer displays one typed result. The sample is local fictional data; supply your own result and host handlers."
          layout="stack"
        >
          <ResultLog result={RESULTS.spoolerLog} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultMetricsExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ResultMetrics"
          description="This renderer displays one typed result. The sample is local fictional data; supply your own result and host handlers."
          layout="stack"
        >
          <ResultMetrics result={RESULTS.health} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultTableExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen
          title="ResultTable"
          description="This renderer displays one typed result. The sample is local fictional data; supply your own result and host handlers."
          layout="stack"
        >
          <ResultTable result={RESULTS.offline} />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultJsonExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="ResultJson" layout="stack">
          <ResultJson
            result={{
              id: "sample-json",
              type: "json",
              title: "Exhibition configuration",
              value: { rooms: 3, open: true, tags: ["art", "design"] },
            }}
          />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultValueExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="ResultValue" layout="stack">
          <ResultValue
            result={{
              id: "sample-value",
              type: "value",
              title: "Reservations",
              label: "This week",
              value: 42,
              unit: "places",
            }}
          />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ResultFrameExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="ResultFrame" layout="stack">
          <ResultFrame
            result={RESULTS.health}
            icon={<IconSparkle />}
            meta="3 values"
            copyText="42 reservations"
          >
            <p>Custom result content uses the shared header and actions.</p>
          </ResultFrame>
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}

export function ShellBrandExample() {
  return (
    <SectionPage>
      <Specimen title="ShellBrand" layout="stack">
        <ShellBrand
          label="Meridian Studio"
          href="#examples"
          mark={<IconOrganisation />}
        />
      </Specimen>
    </SectionPage>
  );
}

export function ShortcutKeysExample() {
  return (
    <SectionPage>
      <Specimen title="ShortcutKeys" layout="stack">
        <ShortcutKeys shortcut="mod+k" />
        <ShortcutKeys shortcut="mod+shift+p" />
      </Specimen>
    </SectionPage>
  );
}

export function StatusGlyphExample() {
  return (
    <SectionPage>
      <Specimen title="StatusGlyph" layout="stack">
        <StatusGlyph status="queued" />
        <StatusGlyph status="running" />
        <StatusGlyph status="succeeded" />
        <StatusGlyph status="failed" />
      </Specimen>
    </SectionPage>
  );
}

export function SwatchExample() {
  return (
    <SectionPage>
      <Specimen title="Swatch" layout="stack">
        <p>
          <Swatch slot={1} shape="line" /> Booked
        </p>
        <p>
          <Swatch slot={2} shape="box" /> Available
        </p>
        <p>
          <Swatch slot={3} shape="dot" /> Waiting list
        </p>
      </Specimen>
    </SectionPage>
  );
}

export function TabNavExample() {
  return (
    <SectionPage>
      <Specimen
        title="TabNav"
        description="Navigation links are supplied by the host. These sample links jump to page anchors; a router can provide route links with the same props."
        layout="stack"
      >
        <TabNav
          items={[
            { value: "overview", label: "Overview" },
            { value: "schedule", label: "Schedule" },
            { value: "access", label: "Access" },
          ]}
          value="overview"
          aria-label="Sample project sections"
          renderLink={(item, props) => (
            <a {...props} href={`#sample-${item.value}`} />
          )}
        />
        <p id="sample-overview">Overview anchor</p>
        <p id="sample-schedule">Schedule anchor</p>
        <p id="sample-access">Access anchor</p>
      </Specimen>
    </SectionPage>
  );
}

export function VerticalTabNavExample() {
  return (
    <SectionPage>
      <Specimen
        title="VerticalTabNav"
        description="Navigation links are supplied by the host. These sample links jump to page anchors; a router can provide route links with the same props."
        layout="stack"
      >
        <VerticalTabNav
          items={[
            { value: "overview", label: "Overview" },
            { value: "schedule", label: "Schedule" },
            { value: "access", label: "Access" },
          ]}
          value="overview"
          aria-label="Sample project sections"
          renderLink={(item, props) => (
            <a {...props} href={`#sample-${item.value}`} />
          )}
        />
        <p id="sample-overview">Overview anchor</p>
        <p id="sample-schedule">Schedule anchor</p>
        <p id="sample-access">Access anchor</p>
      </Specimen>
    </SectionPage>
  );
}

export function ThemeToggleExample() {
  return (
    <SectionPage>
      <Specimen
        title="ThemeToggle"
        description="Cycle the document\u2019s appearance mode. AppearanceProvider is installed by the gallery host."
        layout="stack"
      >
        <ThemeToggle />
      </Specimen>
    </SectionPage>
  );
}

export function TimerChipExample() {
  return (
    <SectionPage>
      <Specimen title="TimerChip" layout="stack">
        <TimerChip label="Exhibition planning" startedAt={NOW - 185000} />
      </Specimen>
    </SectionPage>
  );
}

export function ToastLayoutExample() {
  return (
    <SectionPage>
      <Specimen title="ToastLayout" layout="stack">
        <ToastLayout
          tone="success"
          title="Exhibition saved"
          description="Your fictional sample was updated."
          close={
            <Button size="sm" variant="ghost" aria-label="Dismiss sample toast">
              Dismiss
            </Button>
          }
        />
      </Specimen>
    </SectionPage>
  );
}

export function TooltipBodyExample() {
  return (
    <SectionPage>
      <Specimen title="TooltipBody" layout="stack">
        <div className="glass-overlay fa-chart-tooltip">
          <TooltipBody
            title="Week 1"
            meta="Meridian Studio"
            rows={[
              { key: "booked", label: "Reservations", value: "42", slot: 1 },
              { key: "capacity", label: "Capacity", value: "80", slot: 2 },
            ]}
          />
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function TooltipPopupExample() {
  return (
    <SectionPage>
      <Specimen title="Custom tooltip surface" layout="stack">
        <TooltipPrimitive.Root>
          <TooltipPrimitive.Trigger
            render={<Button>Hover for details</Button>}
          />
          <TooltipPopup side="top" align="center" arrow>
            Sample tooltip content
          </TooltipPopup>
        </TooltipPrimitive.Root>
      </Specimen>
    </SectionPage>
  );
}

export function TooltipProviderExample() {
  return (
    <SectionPage>
      <Specimen
        title="TooltipProvider"
        description="Hover the first control, then its neighbour. The provider shares the delay between nearby tooltips."
        layout="stack"
      >
        <TooltipProvider>
          <Tooltip content="Create an exhibition">
            <Button>Create exhibition</Button>
          </Tooltip>
          <Tooltip content="Search exhibitions">
            <Button>Search</Button>
          </Tooltip>
        </TooltipProvider>
      </Specimen>
    </SectionPage>
  );
}

export function TurnNavigatorExample() {
  const [active, setActive] = useState(0);
  return (
    <SectionPage>
      <Specimen title="Navigate conversation turns" layout="stack">
        <TurnNavigator
          turns={[
            { index: 1, preview: "Plan an exhibition" },
            { index: 2, preview: "Review the schedule" },
            { index: 3, preview: "Confirm the rooms" },
          ]}
          active={active}
          onNavigate={setActive}
        />
        <p>Selected turn: {active + 1}</p>
      </Specimen>
    </SectionPage>
  );
}

function AccountMenuSample({
  name,
  email,
  avatarSrc,
  unread = 0,
}: {
  name: string;
  /** The account’s displayed email address. */
  email?: string;
  /** Profile image URL; an initials fallback is used when it is absent. */
  avatarSrc?: string;
  unread?: number;
}) {
  const [count, setCount] = useState(unread);
  const [profileOpen, setProfileOpen] = useState(false);
  const accountRef = useRef<HTMLButtonElement>(null);
  const closeProfileRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          render={
            <AccountButton
              ref={accountRef}
              name={name}
              email={email}
              avatarSrc={avatarSrc}
              unread={count}
            />
          }
        />
        <Menu.Popup align="end" finalFocus={profileOpen ? false : accountRef}>
          <Menu.Item icon={<IconUser />} onClick={() => setProfileOpen(true)}>
            View profile
          </Menu.Item>
          <Menu.Item
            icon={<IconBell />}
            disabledReason={count === 0 ? "No unread notifications" : undefined}
            trail={count > 0 ? `${count} unread` : undefined}
            onClick={() => setCount(0)}
          >
            Mark notifications read
          </Menu.Item>
        </Menu.Popup>
      </Menu.Root>
      <Dialog.Root open={profileOpen} onOpenChange={setProfileOpen}>
        <Dialog.Popup
          size="sm"
          initialFocus={closeProfileRef}
          finalFocus={accountRef}
        >
          <Dialog.Header title={`${name} profile`} />
          <Dialog.Body>
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={name} src={avatarSrc} size="lg" decorative />
              <div className="min-w-0 break-words">
                <p className="type-label">{name}</p>
                {email ? (
                  <p className="type-caption text-fg-muted">{email}</p>
                ) : null}
              </div>
            </div>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close
              render={<Button ref={closeProfileRef}>Close profile</Button>}
            />
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>
    </>
  );
}

export function AccountButtonExample() {
  return (
    <SectionPage>
      <Specimen
        title="Account menu"
        description="The account button is a Menu trigger. Email is optional; the host supplies the menu actions."
        layout="stack"
      >
        <Example label="Name and email">
          <AccountMenuSample
            name="Avery Quinn"
            email="avery.quinn@orbit.example"
            avatarSrc={PORTRAITS[1]}
            unread={3}
          />
        </Example>
        <Example label="Name only">
          <AccountMenuSample name="Mira Rowan" avatarSrc={PORTRAITS[0]} />
        </Example>
        <Example label="Initials fallback">
          <AccountMenuSample
            name="Casey Reed"
            email="casey.reed@orbit.example"
          />
        </Example>
      </Specimen>
      <ContainerLab
        title="Account in narrow containers"
        description="The avatar keeps its size while the name and email truncate with full-text tooltips."
      >
        {() => (
          <AccountMenuSample
            name="Sage Winter · Regional operations"
            email="sage.winter@operations.orbit.example"
            avatarSrc={PORTRAITS[7]}
          />
        )}
      </ContainerLab>
    </SectionPage>
  );
}

export function AppShellExample() {
  const scope = "Shell";
  return (
    <SectionPage>
      <Specimen
        title="AppShell"
        description="A bounded working shell. Open the inspector from the top bar to inspect the fictional exhibition."
        layout="stack"
      >
        <div className="relative h-120 w-full overflow-hidden">
          <AppShell
            contentAs="div"
            className="h-full!"
            brand={
              <ShellBrand
                label="Meridian"
                href="#examples"
                mark={<IconOrganisation />}
              />
            }
            rail={
              <Rail.Root aria-label={`${scope} sample navigation`}>
                <Rail.Item label="Projects" icon={<IconOrganisation />} />
              </Rail.Root>
            }
            topBar={
              <TopBar
                breadcrumb={<span>Projects / Exhibition</span>}
                actions={<InspectorToggle />}
              />
            }
            inspector={
              <Inspector title={`${scope} exhibition details`}>
                <p>Three rooms, 42 reservations.</p>
              </Inspector>
            }
          >
            <p className="p-5">Sample project workspace</p>
          </AppShell>
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function InspectorExample() {
  const scope = "Inspector";
  return (
    <SectionPage>
      <Specimen
        title="Inspector"
        description="A bounded working shell. Open the inspector from the top bar to inspect the fictional exhibition."
        layout="stack"
      >
        <div className="relative h-120 w-full overflow-hidden">
          <AppShell
            contentAs="div"
            className="h-full!"
            brand={
              <ShellBrand
                label="Meridian"
                href="#examples"
                mark={<IconOrganisation />}
              />
            }
            rail={
              <Rail.Root aria-label={`${scope} sample navigation`}>
                <Rail.Item label="Projects" icon={<IconOrganisation />} />
              </Rail.Root>
            }
            topBar={
              <TopBar
                breadcrumb={<span>Projects / Exhibition</span>}
                actions={<InspectorToggle />}
              />
            }
            inspector={
              <Inspector title={`${scope} exhibition details`}>
                <p>Three rooms, 42 reservations.</p>
              </Inspector>
            }
          >
            <p className="p-5">Sample project workspace</p>
          </AppShell>
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function InspectorToggleExample() {
  const scope = "Inspector toggle";
  return (
    <SectionPage>
      <Specimen
        title="InspectorToggle"
        description="A bounded working shell. Open the inspector from the top bar to inspect the fictional exhibition."
        layout="stack"
      >
        <div className="relative h-120 w-full overflow-hidden">
          <AppShell
            contentAs="div"
            className="h-full!"
            brand={
              <ShellBrand
                label="Meridian"
                href="#examples"
                mark={<IconOrganisation />}
              />
            }
            rail={
              <Rail.Root aria-label={`${scope} sample navigation`}>
                <Rail.Item label="Projects" icon={<IconOrganisation />} />
              </Rail.Root>
            }
            topBar={
              <TopBar
                breadcrumb={<span>Projects / Exhibition</span>}
                actions={<InspectorToggle />}
              />
            }
            inspector={
              <Inspector title={`${scope} exhibition details`}>
                <p>Three rooms, 42 reservations.</p>
              </Inspector>
            }
          >
            <p className="p-5">Sample project workspace</p>
          </AppShell>
        </div>
      </Specimen>
    </SectionPage>
  );
}

export function WindowExample() {
  return (
    <SectionPage>
      <Specimen title="Window body slots" layout="stack">
        <WindowFrame.Root>
          <WindowFrame.AppBar title="Exhibition notes" />
          <Window.Body>
            <p>Content in the shared window body.</p>
          </Window.Body>
          <WindowFrame.StatusBar>
            <Window.StatusItem>Draft</Window.StatusItem>
          </WindowFrame.StatusBar>
        </WindowFrame.Root>
      </Specimen>
    </SectionPage>
  );
}

export function WindowContentHostExample() {
  const [{ manager, id }] = useState(makeWindowDemo);
  return (
    <SectionPage>
      <Specimen title="Load a registered window kind" layout="stack">
        <WindowManagerProvider manager={manager}>
          <WindowFrame.Root>
            <WindowFrame.AppBar title="Exhibition notes" />
            <WindowContentHost id={id} kind="docs.notes" params={{}} />
          </WindowFrame.Root>
        </WindowManagerProvider>
      </Specimen>
    </SectionPage>
  );
}

export function WindowSwitcherExample() {
  const [{ manager }] = useState(makeWindowDemo);
  const [open, setOpen] = useState(false);
  return (
    <SectionPage>
      <Specimen title="Choose an open window" layout="stack">
        <WindowManagerProvider manager={manager}>
          <Button onClick={() => setOpen(true)}>Switch window</Button>
          <WindowSwitcher open={open} onOpenChange={setOpen} />
        </WindowManagerProvider>
      </Specimen>
    </SectionPage>
  );
}

export function PopoutWindowExample() {
  const [{ manager, id }] = useState(makeWindowDemo);
  return (
    <SectionPage>
      <Specimen
        title="Standalone window host"
        description="A real application renders this component on its pop-out route with the same manager storage/channel as the workspace."
        layout="stack"
      >
        <WindowManagerProvider manager={manager}>
          <div className="relative h-90 w-full contain-layout">
            <PopoutWindow id={id} />
          </div>
        </WindowManagerProvider>
      </Specimen>
    </SectionPage>
  );
}

export function ActionMenuItemsExample() {
  const actions = defineActions<{ id: string }>("exhibitions", [
    {
      id: "open",
      label: "Open exhibition",
      group: "open",
      run: () => toast.info("Sample exhibition opened"),
    },
  ]);
  const targets = [{ id: "meridian" }];
  const groups = resolveActions(actions, targets, "menu");
  return (
    <SectionPage>
      <Specimen title="Rows from shared action definitions">
        <Menu.Root>
          <Menu.Trigger render={<Button>Exhibition actions</Button>} />
          <Menu.Popup>
            <ActionMenuItems groups={groups} targets={targets} surface="menu" />
          </Menu.Popup>
        </Menu.Root>
      </Specimen>
    </SectionPage>
  );
}

export function HitLayerExample() {
  const store = useHoverStore();
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <SectionPage>
      <Specimen
        title="Pointer and keyboard plot navigation"
        description="Tab into the plot and use Left/Right to move between the three values."
        layout="stack"
      >
        <div ref={anchor} className="relative h-60 w-full">
          <svg
            viewBox="0 0 300 160"
            className="h-full w-full"
            role="img"
            aria-label="Three sample values"
          >
            {[40, 65, 80].map((value, i) => (
              <circle
                key={i}
                cx={50 + i * 100}
                cy={160 - value}
                r={6}
                fill="var(--chart-1)"
              />
            ))}
          </svg>
          <HitLayer
            store={store}
            count={3}
            label="Sample reservations"
            locate={(x) => Math.max(0, Math.min(2, Math.floor(x / 100)))}
            anchor={(index) => ({ x: 50 + index * 100, y: 80 })}
            valueText={(index) =>
              `Week ${index + 1}: ${[40, 65, 80][index]} reservations`
            }
          />
        </div>
        <ChartTooltip anchor={anchor} store={store}>
          {(hover) => (
            <TooltipBody
              title={`Week ${hover.index + 1}`}
              rows={[
                {
                  key: "booked",
                  label: "Reservations",
                  value: String([40, 65, 80][hover.index]),
                  slot: 1,
                },
              ]}
            />
          )}
        </ChartTooltip>
      </Specimen>
    </SectionPage>
  );
}

export function EntityResolverProviderExample() {
  return (
    <SectionPage>
      <Specimen title="Host-defined entity presentation" layout="stack">
        <EntityResolverProvider resolver={demoResolver}>
          <EntityChip entity={E.northstar} />
          <EntityChip entity={E.mira} />
        </EntityResolverProvider>
      </Specimen>
    </SectionPage>
  );
}
export function ConversationHandlersProviderExample() {
  return (
    <SectionPage>
      <Specimen
        title="Wire assistant decisions to the host"
        description="Choose an answer. The host callback displays the submitted answer; no backend is called."
        layout="stack"
      >
        <ConversationHandlersProvider
          handlers={{
            answer: async (_id, answer) => {
              toast.info(`Demo answer: ${JSON.stringify(answer)}`);
            },
          }}
        >
          <QuickRepliesAsk ask={ASKS.quick} />
        </ConversationHandlersProvider>
      </Specimen>
    </SectionPage>
  );
}
export function ActionProviderExample() {
  return (
    <SectionPage>
      <Specimen
        title="Host action services"
        description="Mount ActionProvider inside the router. Nested providers inherit the shared toast and confirmation hosts."
        layout="stack"
      >
        <ActionProvider
          navigate={(path) => toast.info(`Demo destination: ${path}`)}
        >
          <ActionMenu
            label="Exhibition"
            set={SAMPLE_ACTIONS}
            targets={[{ id: "meridian" }]}
          />
        </ActionProvider>
      </Specimen>
    </SectionPage>
  );
}
export function ConfirmHostExample() {
  return (
    <SectionPage>
      <Specimen
        title="Promise-based confirmation"
        description="Mount one host at the application root. ActionProvider already supplies it; duplicate mounts are suppressed."
        layout="stack"
      >
        <ConfirmHost />
        <Button
          onClick={() =>
            void confirm({
              title: "Archive the sample exhibition?",
              description: "The fictional exhibition can be restored later.",
              confirmLabel: "Archive",
              onConfirm: async () => {
                toast.info("Sample archived");
              },
            })
          }
        >
          Ask for confirmation
        </Button>
      </Specimen>
    </SectionPage>
  );
}
export function ToasterExample() {
  return (
    <SectionPage>
      <Specimen
        title="Shared notification viewport"
        description="Mount once at the root; ActionProvider supplies this automatically. Activate a button to see a notification."
        layout="stack"
      >
        <Toaster />
        <Button onClick={() => toast.success("Sample exhibition saved")}>
          Show success toast
        </Button>
        <Button onClick={() => toast.danger("Sample upload failed")}>
          Show error toast
        </Button>
      </Specimen>
    </SectionPage>
  );
}
function DemoPaletteCommands() {
  const palette = useCommandPalette();
  usePaletteCommands([
    {
      id: "sample-open",
      label: "Open exhibition",
      group: "Projects",
      run: () => toast.info("Sample exhibition opened"),
    },
    {
      id: "sample-save",
      label: "Save exhibition",
      group: "Actions",
      run: () => toast.success("Sample saved"),
    },
  ]);
  return <Button onClick={palette.open}>Open command palette</Button>;
}
export function PaletteProviderExample() {
  return (
    <SectionPage>
      <Specimen title="Register commands in a host" layout="stack">
        <PaletteProvider>
          <DemoPaletteCommands />
        </PaletteProvider>
      </Specimen>
    </SectionPage>
  );
}
export function PanelExample() {
  return (
    <SectionPage>
      <Specimen title="Content panel slots" layout="stack">
        <Panel>
          <PanelHeader
            title="Exhibition overview"
            description="Fictional studio project"
          />
          <PanelBody>
            Three rooms are reserved for the next exhibition.
          </PanelBody>
          <PanelFooter>
            <Button>View schedule</Button>
          </PanelFooter>
        </Panel>
      </Specimen>
    </SectionPage>
  );
}
export function SurfaceExample() {
  return (
    <SectionPage>
      <Specimen title="Theme-owned surface geometry" layout="stack">
        <Surface material="panel" padding="panel">
          Panel material, surface corners and the theme's panel inset.
        </Surface>
        <Surface material="card" radius="tile" padding="tile">
          Repeated cards use tile geometry and the unblurred card material.
        </Surface>
      </Specimen>
    </SectionPage>
  );
}
export function PanelHeaderExample() {
  return (
    <SectionPage>
      <Specimen title="Panel heading and actions" layout="stack">
        <Panel>
          <PanelHeader
            icon={<IconOrganisation />}
            title="Exhibition overview"
            description="Three rooms · next month"
            actions={<Button variant="ghost">Edit</Button>}
          />
          <PanelBody>Panel body content.</PanelBody>
        </Panel>
      </Specimen>
    </SectionPage>
  );
}
export function PanelBodyExample() {
  return (
    <SectionPage>
      <Specimen title="Panel body content" layout="stack">
        <Panel>
          <PanelHeader title="Exhibition notes" />
          <PanelBody>
            <p>The body provides consistent content padding.</p>
            <p>Use scroll on the parent Panel for bounded content.</p>
          </PanelBody>
        </Panel>
      </Specimen>
    </SectionPage>
  );
}
export function PanelFooterExample() {
  return (
    <SectionPage>
      <Specimen title="Panel footer actions" layout="stack">
        <Panel>
          <PanelHeader title="Exhibition notes" />
          <PanelBody>Review the fictional schedule.</PanelBody>
          <PanelFooter>
            <Button variant="ghost">Cancel</Button>
            <Button variant="primary">Save schedule</Button>
          </PanelFooter>
        </Panel>
      </Specimen>
    </SectionPage>
  );
}

export function IdentityCellExample() {
  return (
    <SectionPage>
      <Specimen title="Primary identity in a table cell" layout="stack">
        <IdentityCell
          title="Meridian Studio"
          subtitle="Exhibition project"
          icon={<IconOrganisation />}
        />
      </Specimen>
    </SectionPage>
  );
}
export function TextCellExample() {
  return (
    <SectionPage>
      <Specimen title="Text, truncation and alignment" layout="stack">
        <div className="w-70">
          <TextCell>Meridian Studio exhibition and design workshop</TextCell>
        </div>
        <TextCell>Short label</TextCell>
      </Specimen>
    </SectionPage>
  );
}
export function TwoLineCellExample() {
  return (
    <SectionPage>
      <Specimen title="Value and supporting text" layout="stack">
        <div className="max-w-full w-70">
          <TwoLineCell
            title="Windows 11 Business"
            subtitle="Version 24H2 · 64-bit"
          />
        </div>
        <TwoLineCell title="No supporting text" />
      </Specimen>
    </SectionPage>
  );
}

export function UserMessageExample() {
  return (
    <AiGallery>
      <SectionPage>
        <Specimen title="Editable user message" layout="stack">
          <UserMessage
            message={{
              id: "sample-user-message",
              role: "user",
              createdAt: NOW,
              state: "complete",
              blocks: [
                {
                  kind: "markdown",
                  text: "List the exhibitions scheduled for next month.",
                },
              ],
            }}
            editable
          />
        </Specimen>
      </SectionPage>
    </AiGallery>
  );
}
export function NumericCellExample() {
  return (
    <SectionPage>
      <Specimen title="Formatted numeric table values" layout="stack">
        <NumericCell value={42} unit="places" />
        <NumericCell value={18.5} unit="GB" fractionDigits={1} />
      </Specimen>
    </SectionPage>
  );
}
export function RelativeTimeExample() {
  return (
    <SectionPage>
      <Specimen title="Relative time with an exact-time tooltip" layout="stack">
        <RelativeTime value={NOW - 120000} />
        <RelativeTime value={NOW - 3600000} />
      </Specimen>
    </SectionPage>
  );
}
export function SparklineCellExample() {
  return (
    <SectionPage>
      <Specimen title="Compact table trend" layout="stack">
        <div className="h-12 w-70">
          <SparklineCell
            values={[12, 18, 16, 24, 28, 22, 31]}
            domain={[0, 40]}
            label="Weekly reservations"
            unit="places"
          />
        </div>
      </Specimen>
    </SectionPage>
  );
}
