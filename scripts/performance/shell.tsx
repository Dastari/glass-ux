import type {} from "./runtime.js";
// A FAME-like resting screen: docked drawer and inspector over the silk canvas, a primary
// view of panels, a live pulse and a pending spinner. Query parameters:
//   mode, palette, background, glass, motion   <html> appearance attributes
//   pulse=0  spin=0                            remove the live pulse / spinner
//   buttons=300                                mount N tooltip buttons instead (mount timing)
import { createRoot } from "react-dom/client";
import { useLayoutEffect } from "react";
import {
  AppShell,
  Inspector,
  Rail,
  SectionDrawer,
  ShellBrand,
  TopBar,
} from "glass-ux/shell";
import {
  Workspace,
  WindowManagerProvider,
  createWindowManager,
} from "glass-ux/windows";
import { Panel, PanelBody, PanelHeader } from "glass-ux/surface";
import { Badge } from "glass-ux/badge";
import { Button } from "glass-ux/button";
import { EntityIdentity } from "glass-ux/entity";
import { TooltipProvider } from "glass-ux/tooltip";
import { IconOrganisation, IconPrinter, IconSettings } from "glass-ux/icons";
import "glass-ux/styles.css";

const params = new URLSearchParams(location.search);
const html = document.documentElement;
for (const key of ["mode", "palette", "background", "glass", "motion"])
  if (params.has(key)) html.dataset[key] = params.get(key)!;
const pulse = params.get("pulse") !== "0";
const spin = params.get("spin") !== "0";
const buttons = Number(params.get("buttons") ?? 0);
// tooltip=0: the same buttons without their tooltips, to separate the two costs.
const withTooltips = params.get("tooltip") !== "0";
// status=idle: buttons that track a status (ActionButton, ActionBar), resting.
const trackStatus = params.get("status") === "idle";
// pulseAt=canvas: one live pulse on the bare canvas, outside every blurred layer.
// pulseAt=over: one pulse fixed over the inspector, painted above it but not inside it.
const pulseOnCanvas = params.get("pulseAt") === "canvas";
const pulseOver = params.get("pulseAt") === "over";
document.body.style.margin = "0";
window.__perf ??= { keys: 0, cells: 0 };

const manager = createWindowManager({ storageKey: null });

function Ready() {
  useLayoutEffect(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => (window.__ready = true)),
    );
  }, []);
  return null;
}

function Primary() {
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--gap-panels)",
        height: "100%",
        gridTemplateRows: "auto 1fr",
      }}
    >
      <Panel>
        <PanelHeader title="Sample printers" description="North studio" />
        <PanelBody>
          <p>Twelve devices in three rooms.</p>
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title="Queue" />
        <PanelBody>
          <ul>
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i}>Sample job {i + 1}</li>
            ))}
          </ul>
        </PanelBody>
      </Panel>
    </div>
  );
}

function ShellFixture() {
  return (
    <WindowManagerProvider manager={manager}>
      <AppShell
        brand={
          <ShellBrand label="Sample" href="#" mark={<IconOrganisation />} />
        }
        rail={
          <Rail.Root aria-label="Sample navigation">
            <Rail.Item label="Devices" icon={<IconPrinter />} active />
            <Rail.Item label="Settings" icon={<IconSettings />} />
          </Rail.Root>
        }
        drawer={
          <SectionDrawer.Root aria-label="Sample sections">
            <SectionDrawer.Header title="Devices" />
            <SectionDrawer.Body>
              <SectionDrawer.List>
                <SectionDrawer.Item label="Printers" count={12} active />
                <SectionDrawer.Item label="Scanners" count={3} />
              </SectionDrawer.List>
              {pulse ? (
                <Badge tone="success" marker="pulse">
                  Live
                </Badge>
              ) : null}
            </SectionDrawer.Body>
          </SectionDrawer.Root>
        }
        topBar={<TopBar breadcrumb={<span>Devices / Printers</span>} />}
        inspector={
          <Inspector title="Sample printer">
            <EntityIdentity
              tier="header"
              name="PRN-0042"
              kind="Printer"
              icon={<IconPrinter />}
              state={{
                id: "printing",
                label: "Printing",
                tone: "success",
                activity: pulse,
              }}
              facts={["Sample model", "10.0.0.42"]}
            />
            {spin ? <Button status="pending">Refreshing</Button> : null}
          </Inspector>
        }
      >
        <Workspace primary={<Primary />} primaryLabel="Printers" dock={false} />
      </AppShell>
    </WindowManagerProvider>
  );
}

function ButtonsFixture({ count }: { count: number }) {
  return (
    <TooltipProvider>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 16 }}>
        {Array.from({ length: count }, (_, i) => (
          // Icon-only buttons carry their own tooltip.
          <Button
            key={i}
            variant="secondary"
            size="sm"
            icon={<IconSettings />}
            aria-label={`Sample action ${i}`}
            tooltip={withTooltips ? undefined : false}
            status={trackStatus ? "idle" : undefined}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
if (buttons) {
  // Mount timing: render into a fresh root on demand so the measurement excludes page load.
  document.body.classList.remove("canvas-ambient");
  (window as unknown as { __mount: () => Promise<number> }).__mount = () =>
    new Promise((resolve) => {
      const start = performance.now();
      root.render(
        <>
          <ButtonsFixture count={buttons} />
          <MountDone start={start} resolve={resolve} />
        </>,
      );
    });
  window.__ready = true;
} else
  root.render(
    <>
      <ShellFixture />
      {pulseOnCanvas || pulseOver ? (
        <span
          style={
            pulseOver
              ? {
                  position: "fixed",
                  insetInlineEnd: 200,
                  insetBlockStart: 400,
                  zIndex: 50,
                }
              : {
                  position: "fixed",
                  insetInlineStart: 4,
                  insetBlockEnd: 4,
                  zIndex: 50,
                }
          }
        >
          <Badge tone="success" marker="pulse">
            Live
          </Badge>
        </span>
      ) : null}
      <Ready />
    </>,
  );

function MountDone({
  start,
  resolve,
}: {
  start: number;
  resolve: (ms: number) => void;
}) {
  useLayoutEffect(() => {
    // Commit (including layout effects) is done; passive effects flush before the next frame.
    const commit = performance.now() - start;
    setTimeout(() => resolve(commit), 0);
  }, [start, resolve]);
  return null;
}
