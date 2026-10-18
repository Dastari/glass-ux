/**
 * The workspace: everything in it is a window (R5.3, R14).
 *
 *   primary    the routed view, in column 0 (or the whole stage when nothing is tiled)
 *   tiled      columns beside the primary, divided by draggable split handles
 *   floating   over the tiled layer, free or snapped to a zone, z-ordered
 *   maximised  fills the stage
 *   minimised  mounted but hidden and inert (state kept, work paused); listed in the dock
 *   sheet      phones: the focused window covers the screen; a switcher lists the rest
 *
 * Geometry is CSS: fractional rectangles become container-unit maths against the stage
 * (a size container), so windows render correctly on the first frame and follow resizes
 * without measuring. Only the column count is measured.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { IconWindows } from "../icons/generated/icons.js";
import { cx } from "../lib/cx.js";
import { useFlip } from "../lib/flip.js";
import { observeElementSize } from "../lib/resize-observer.js";
import { PHONE_QUERY, useMediaQuery } from "../lib/use-media-query.js";
import { Button } from "../ui/button/index.js";
import { createDragStore, type DragStore } from "./drag.js";
import { Dock, WindowSwitcher } from "./dock.js";
import {
  SNAP_LAYOUTS,
  SNAP_ZONES,
  SNAP_ZONE_LABELS,
  assignTiles,
  clamp,
  fracVars,
  maxTileColumns,
  type FracRect,
} from "./geometry.js";
import {
  ManagedWindow,
  WorkspaceLinkContext,
  type WorkspaceLink,
} from "./managed-window.js";
import { WindowScopeProvider, type WindowScopes } from "./scope.js";
import {
  useFocusedWindowId,
  useWindowManager,
  useWindowState,
  useWindows,
} from "./react.js";
import type { WindowManager } from "./store.js";
import { PRIMARY_WINDOW_ID, type WindowEntry } from "./types.js";
import { WindowFrame } from "./window-frame.js";

/** Narrowest a tiled column may become, in rem. */
const MIN_COLUMN_REM = 22;
const FULL: FracRect = { x: 0, y: 0, w: 1, h: 1 };
/** Where a window dropped on "beside the page" will go: the column after the primary. */
const TILE_PREVIEW: FracRect = { x: 0.5, y: 0, w: 0.5, h: 1 };

export interface WorkspaceProps {
  /** The routed view. Render EntityHeader, WindowFrame.Body and WindowFrame.StatusBar. */
  primary: ReactNode;
  /** Accessible name for the primary window, normally the entity or page title. */
  primaryLabel: string;
  /** Show the dock of open windows (default true). */
  dock?: boolean;
  /**
   * The tenant scope the user is in and how to draw one (R14.4). Windows from another scope
   * show its chip in their app bar, and the dock groups windows by scope. Omit for a
   * product without scopes.
   */
  scopes?: WindowScopes;
  className?: string;
}

interface StageMetrics {
  /** Available width or named width tier. */
  width: number;
  /** Available height used for the component’s size tier. */
  height: number;
  /** --gap-panels in CSS pixels. */
  gap: number;
  /** The root font size (follows --ui-scale). */
  rem: number;
}

const NO_METRICS: StageMetrics = { width: 0, height: 0, gap: 16, rem: 16 };
const stageMetrics = new WeakMap<Element, StageMetrics>();

function readMetrics(stage: HTMLElement): StageMetrics {
  const rem =
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
    16;
  const box = stage.getBoundingClientRect();
  return {
    width: box.width,
    height: box.height,
    gap: Number.parseFloat(getComputedStyle(stage).columnGap) || rem,
    rem,
  };
}

/** The stage's size, panel gap and rem, observed with a ResizeObserver. */
function useStageMetrics(stage: HTMLElement | null): StageMetrics {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!stage) return () => {};
      const update = (announce: boolean) => {
        const next = readMetrics(stage);
        const previous = stageMetrics.get(stage);
        if (
          previous &&
          previous.width === next.width &&
          previous.height === next.height &&
          previous.gap === next.gap &&
          previous.rem === next.rem
        )
          return;
        stageMetrics.set(stage, next);
        if (announce) notify();
      };
      update(false);
      return observeElementSize(stage, () => update(true));
    },
    [stage],
  );
  return useSyncExternalStore(
    subscribe,
    () => (stage ? (stageMetrics.get(stage) ?? NO_METRICS) : NO_METRICS),
    () => NO_METRICS,
  );
}

function useViewportWidth() {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("resize", notify);
      return () => window.removeEventListener("resize", notify);
    },
    () => window.innerWidth,
    () => 1920,
  );
}

function columnVars(
  column: number,
  columns: number,
  row: number,
  rows: number,
): Record<string, string | number> {
  return {
    "--_fx": `var(--_d${column})`,
    "--_fw": `calc(var(--_d${column + 1}) - var(--_d${column}))`,
    "--_fy": row / rows,
    "--_fh": 1 / rows,
    "--_gl": column > 0 ? 1 : 0,
    "--_gr": column < columns - 1 ? 1 : 0,
    "--_gt": row > 0 ? 1 : 0,
    "--_gb": row < rows - 1 ? 1 : 0,
  };
}

export function Workspace({
  primary,
  primaryLabel,
  dock = true,
  scopes,
  className,
}: WorkspaceProps) {
  const manager = useWindowManager();
  const windows = useWindows();
  const focusedId = useFocusedWindowId();
  const splits = useWindowState((state) => state.splits);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const metrics = useStageMetrics(stage);
  const size = metrics;
  const viewport = useViewportWidth();
  const sheet = useMediaQuery(PHONE_QUERY);
  const drag = useMemo(() => createDragStore(), []);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(
    () => manager.setWorkspaceSize(size.width, size.height),
    [manager, size.width, size.height],
  );
  // Geometry animates only after the first layout, so restoring a layout never sweeps in.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  useWindowShortcuts(manager);

  const visible = windows.filter((entry) => !entry.poppedOut);
  const tiledIds = visible
    .filter((entry) => entry.layout === "tiled" && !entry.minimised)
    .map((entry) => entry.id);
  const maxColumns =
    sheet || size.width === 0
      ? 1
      : maxTileColumns(
          viewport,
          size.width,
          MIN_COLUMN_REM * metrics.rem,
          metrics.gap,
        );
  const { columns, slots } = assignTiles(tiledIds, maxColumns);
  const dividers =
    columns >= 2 ? (splits[String(columns) as "2" | "3"] ?? []) : [];

  const stageVars: Record<string, string | number> = {
    "--_d0": 0,
    [`--_d${columns}`]: 1,
  };
  dividers.forEach((value, index) => {
    stageVars[`--_d${index + 1}`] = value;
  });

  // Floating and maximised windows stack above the tiled layer in z order.
  const ranks = new Map(
    visible
      .filter((entry) => entry.layout !== "tiled" || !slots.has(entry.id))
      .toSorted((a, b) => a.z - b.z)
      .map((entry, index) => [entry.id, index]),
  );
  const sheetTop = sheet
    ? visible
        .filter((entry) => !entry.minimised)
        .toSorted((a, b) => b.z - a.z)[0]?.id
    : undefined;
  const sheetFront =
    sheet && focusedId !== PRIMARY_WINDOW_ID
      ? (focusedId ?? sheetTop)
      : undefined;

  const link = useMemo<WorkspaceLink>(
    () => ({
      stageRef,
      drag,
      sheet,
      sheetLeading: (
        <Button
          variant="ghost"
          size="sm"
          icon={<IconWindows />}
          aria-label="Switch windows"
          onClick={() => setSwitcherOpen(true)}
        />
      ),
    }),
    [drag, sheet],
  );

  // A phone sheet covers the shell: tell the shell so it can hide its chrome beneath
  // (glass would otherwise show the tab bar through the sheet).
  useEffect(() => {
    if (!sheetFront) return;
    document.documentElement.dataset.windowSheet = "";
    return () => {
      delete document.documentElement.dataset.windowSheet;
    };
  }, [sheetFront]);

  const primaryVars =
    columns >= 2 ? columnVars(0, columns, 0, 1) : fracVars(FULL);

  return (
    <WindowScopeProvider value={scopes}>
      <WorkspaceLinkContext.Provider value={link}>
        <div
          className={cx("fa-wm-workspace", className)}
          data-sheet={sheet ? "" : undefined}
        >
          <div
            ref={(element) => {
              stageRef.current = element;
              setStage(element);
            }}
            className="fa-wm-workspace-stage"
            data-ready={ready ? "" : undefined}
            data-columns={columns}
            style={stageVars as CSSProperties}
          >
            <PrimaryWindow
              label={primaryLabel}
              focused={focusedId === PRIMARY_WINDOW_ID}
              vars={primaryVars}
              hidden={Boolean(sheetFront)}
              onFocus={() => manager.focus(PRIMARY_WINDOW_ID)}
            >
              {primary}
            </PrimaryWindow>

            {visible.map((entry) => {
              const slot = slots.get(entry.id);
              const { geometry, vars } = windowGeometry(
                entry,
                slot,
                columns,
                ranks.get(entry.id) ?? 0,
                sheet,
              );
              return (
                <ManagedWindow
                  key={entry.id}
                  entry={entry}
                  focused={focusedId === entry.id}
                  geometry={geometry}
                  vars={vars}
                  hidden={sheet && entry.id !== sheetFront}
                />
              );
            })}

            {dividers.map((value, index) => (
              <SplitHandle
                key={`${columns}-${index}`}
                index={index}
                columns={columns}
                value={value}
                dividers={dividers}
                manager={manager}
                stageRef={stageRef}
                minFraction={
                  size.width > 0
                    ? (MIN_COLUMN_REM * metrics.rem) / size.width
                    : 0.2
                }
              />
            ))}

            {sheet ? null : <SnapOverlay drag={drag} />}
          </div>
          {dock ? (
            <Dock
              onOpenSwitcher={sheet ? () => setSwitcherOpen(true) : undefined}
            />
          ) : null}
          {sheet ? (
            <WindowSwitcher
              open={switcherOpen}
              onOpenChange={setSwitcherOpen}
              primaryLabel={primaryLabel}
            />
          ) : null}
        </div>
      </WorkspaceLinkContext.Provider>
    </WindowScopeProvider>
  );
}

function windowGeometry(
  entry: WindowEntry,
  slot: { column: number; row: number; rows: number } | undefined,
  columns: number,
  rank: number,
  sheet: boolean,
): {
  geometry: "free" | "frac" | "sheet";
  vars: Record<string, string | number>;
} {
  if (sheet) return { geometry: "sheet", vars: { "--_z": 10 + rank } };
  if (entry.layout === "tiled" && slot) {
    return {
      geometry: "frac",
      vars: {
        ...columnVars(slot.column, columns, slot.row, slot.rows),
        "--_z": 1,
      },
    };
  }
  const z = { "--_z": 10 + rank };
  if (entry.layout === "maximised" || entry.layout === "tiled")
    return { geometry: "frac", vars: { ...fracVars(FULL), ...z } };
  if (entry.snap)
    return {
      geometry: "frac",
      vars: { ...fracVars(SNAP_ZONES[entry.snap]), ...z },
    };
  return {
    geometry: "free",
    vars: {
      "--_x": entry.rect.x,
      "--_y": entry.rect.y,
      "--_w": entry.rect.w,
      "--_h": entry.rect.h,
      ...z,
    },
  };
}

/* ── Primary window ──────────────────────────────────────────────────────── */

function PrimaryWindow({
  label,
  focused,
  vars,
  hidden,
  onFocus,
  children,
}: {
  label: string;
  focused: boolean;
  vars: Record<string, string | number>;
  /** Keeps the item out of the visible layout. */
  hidden: boolean;
  /** Called when focus occurs. The callback type specifies its arguments. */
  onFocus: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const wasFocused = useRef(focused);
  useEffect(() => {
    const frame = ref.current;
    if (
      focused &&
      !wasFocused.current &&
      frame &&
      !frame.contains(document.activeElement)
    )
      frame.focus({ preventScroll: true });
    wasFocused.current = focused;
  }, [focused]);
  return (
    <WindowFrame.Root
      ref={ref}
      className="fa-wm-window"
      material="none"
      focused={focused}
      state="primary"
      tabIndex={-1}
      aria-label={label}
      data-primary=""
      data-geometry="frac"
      data-hidden={hidden ? "" : undefined}
      inert={hidden}
      style={{ ...vars, "--_z": 1 } as CSSProperties}
      onPointerDownCapture={onFocus}
      onFocusCapture={onFocus}
    >
      <div className="fa-window-view">{children}</div>
    </WindowFrame.Root>
  );
}

/* ── Split handles ───────────────────────────────────────────────────────── */

function SplitHandle({
  index,
  columns,
  value,
  dividers,
  manager,
  stageRef,
  minFraction,
}: {
  /** Index of the current item. */
  index: number;
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: number;
  value: number;
  dividers: readonly number[];
  /** Window manager that owns descriptors, focus, layout and persistence. */
  manager: WindowManager;
  stageRef: RefObject<HTMLDivElement | null>;
  minFraction: number;
}) {
  const [active, setActive] = useState(false);
  const name = `--_d${index + 1}`;
  const bounds = () => {
    const min = (index === 0 ? 0 : (dividers[index - 1] ?? 0)) + minFraction;
    const max =
      (index === dividers.length - 1 ? 1 : (dividers[index + 1] ?? 1)) -
      minFraction;
    return { min, max };
  };
  const commit = (fraction: number) => {
    const next = [...dividers];
    next[index] = fraction;
    manager.setSplits(columns as 2 | 3, next);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (event.button !== 0 || !stage) return;
    event.preventDefault();
    const box = stage.getBoundingClientRect();
    const { min, max } = bounds();
    let fraction = value;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    setActive(true);
    stage.dataset.splitting = "";
    const move = (moveEvent: PointerEvent) => {
      fraction = clamp((moveEvent.clientX - box.left) / box.width, min, max);
      stage.style.setProperty(name, String(fraction));
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      delete stage.dataset.splitting;
      setActive(false);
      flushSync(() => commit(fraction));
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const { min, max } = bounds();
    const delta =
      event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    if (event.key === "Home") commit(min);
    else if (event.key === "End") commit(max);
    else if (delta) commit(clamp(value + delta, min, max));
    else return;
    event.preventDefault();
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={`Resize column ${index + 1}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="fa-wm-split-handle"
      data-active={active ? "" : undefined}
      style={{ "--_d": `var(${name})` } as CSSProperties}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => {
        const reset = columns === 2 ? [0.5] : [0.4, 0.7];
        manager.setSplits(columns as 2 | 3, reset);
      }}
    >
      <span className="fa-wm-split-grip" aria-hidden />
    </div>
  );
}

/* ── Snapping ────────────────────────────────────────────────────────────── */

function useDrag(drag: DragStore) {
  return useSyncExternalStore(drag.subscribe, drag.get, drag.get);
}

/** The snap bar (layouts to drop onto) and the live preview of where the window will land. */
function SnapOverlay({ drag }: { drag: DragStore }) {
  const { id, target, layout } = useDrag(drag);
  const previewRef = useRef<HTMLDivElement>(null);
  // The preview moves between zones with transform only (measured, then inverted).
  useFlip(previewRef, `${id ?? ""}|${target ?? ""}`);
  if (!id) return null;
  const preview: FracRect | null =
    target === "maximise"
      ? FULL
      : target === "tile"
        ? TILE_PREVIEW
        : target
          ? SNAP_ZONES[target]
          : null;
  return (
    <>
      <div
        ref={previewRef}
        className="fa-wm-snap-preview"
        data-geometry="frac"
        data-visible={preview ? "" : undefined}
        style={(preview ? fracVars(preview) : fracVars(FULL)) as CSSProperties}
        aria-hidden
      />
      <div className="glass-overlay fa-wm-snap-bar">
        <div className="fa-wm-snap-choices" aria-hidden>
          <div className="fa-wm-snap-layout">
            <span
              className="fa-wm-snap-zone"
              data-page=""
              style={fracVars({ x: 0, y: 0, w: 0.5, h: 1 }) as CSSProperties}
            />
            <span
              className="fa-wm-snap-zone"
              data-snap-zone="tile"
              data-snap-layout={-1}
              data-active={target === "tile" ? "" : undefined}
              style={fracVars(TILE_PREVIEW) as CSSProperties}
            />
          </div>
          {SNAP_LAYOUTS.map((group, groupIndex) => (
            <div key={group.label} className="fa-wm-snap-layout">
              {group.zones.map((zone) => (
                <span
                  key={zone}
                  className="fa-wm-snap-zone"
                  data-snap-zone={zone}
                  data-snap-layout={groupIndex}
                  data-active={
                    target === zone &&
                    (layout === null || layout === groupIndex)
                      ? ""
                      : undefined
                  }
                  style={fracVars(SNAP_ZONES[zone]) as CSSProperties}
                />
              ))}
            </div>
          ))}
        </div>
        <span className="fa-wm-snap-label" role="status" aria-live="polite">
          {target === "tile"
            ? "Tile beside the page"
            : target === "maximise"
              ? "Maximise window"
              : target
                ? SNAP_ZONE_LABELS[target]
                : "Drag to a layout to snap the window"}
        </span>
      </div>
    </>
  );
}

/* ── Keyboard ────────────────────────────────────────────────────────────── */

const RIGHT_ZONES = new Set([
  "right-half",
  "right-third",
  "right-two-thirds",
  "top-right",
  "bottom-right",
]);
const LEFT_ZONES = new Set([
  "left-half",
  "left-third",
  "left-two-thirds",
  "top-left",
  "bottom-left",
]);

/**
 * Ctrl+Alt+arrows move the focused window (R11.5):
 *   ←/→  snap to the left/right half; from the opposite side, release to free floating
 *   ↑    maximise
 *   ↓    restore a maximised window, release a snapped one, otherwise minimise
 * Surfaces that own the keyboard (remote desktop, terminal) opt out with
 * data-keyboard-capture.
 */
function useWindowShortcuts(manager: WindowManager) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey)
        return;
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      if (
        (event.target as Element | null)?.closest?.("[data-keyboard-capture]")
      )
        return;
      const id = manager.getState().focusedId;
      const entry = id ? manager.get(id) : undefined;
      if (!entry || entry.poppedOut) return;
      event.preventDefault();
      switch (event.key) {
        case "ArrowUp":
          manager.maximise(entry.id);
          break;
        case "ArrowDown":
          if (entry.layout === "maximised") manager.unmaximise(entry.id);
          else if (entry.layout === "floating" && entry.snap)
            manager.float(entry.id);
          else manager.minimise(entry.id);
          break;
        case "ArrowLeft":
          if (entry.snap && RIGHT_ZONES.has(entry.snap))
            manager.float(entry.id);
          else manager.snap(entry.id, "left-half");
          break;
        case "ArrowRight":
          if (entry.snap && LEFT_ZONES.has(entry.snap)) manager.float(entry.id);
          else manager.snap(entry.id, "right-half");
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [manager]);
}
