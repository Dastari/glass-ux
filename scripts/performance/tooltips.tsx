import type {} from "./runtime.js";
// Tooltip behaviour fixture: a toolbar of icon buttons, a labelled button with a reason, a
// tooltip whose text differs from its trigger's name, and one inside a dialog (Escape).
import { createRoot } from "react-dom/client";
import { useLayoutEffect, useState } from "react";
import { Button } from "glass-ux/button";
import { Tooltip, TooltipProvider } from "glass-ux/tooltip";
import { Dialog } from "glass-ux/dialog";
import { IconSettings, IconPrinter, IconOrganisation } from "glass-ux/icons";

function Ready() {
  useLayoutEffect(() => {
    window.__ready = true;
  }, []);
  return null;
}

function Removable() {
  // window.__fixture.remove() takes trigger "c" away (while its tooltip shows).
  const [shown, setShown] = useState(true);
  window.__fixture = {
    ...window.__fixture,
    remove: () => setShown(false),
  } as typeof window.__fixture;
  return shown ? (
    <Button
      variant="ghost"
      icon={<IconOrganisation />}
      aria-label="Sample organisation"
      data-t="c"
    />
  ) : (
    <span style={{ width: 40 }} />
  );
}

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Button
        variant="ghost"
        icon={<IconSettings />}
        aria-label="Sample settings"
        data-t="a"
      />
      <Button
        variant="ghost"
        icon={<IconPrinter />}
        aria-label="Sample printers"
        data-t="b"
        shortcut="mod+p"
      />
      <Removable />
      <span style={{ width: 120 }} />
      <Button disabledReason="Sample reason" data-t="d">
        Archive
      </Button>
      <Tooltip content="Opens the sample report in a new window">
        <Button data-t="e">Report</Button>
      </Tooltip>
      <Tooltip content="Sample bottom tooltip" side="bottom">
        <Button
          variant="ghost"
          icon={<IconSettings />}
          aria-label="Bottom"
          data-t="f"
          tooltip={false}
        />
      </Tooltip>
    </div>
    <Dialog.Root
      defaultOpen={new URLSearchParams(location.search).has("dialog")}
    >
      <Dialog.Popup aria-label="Sample dialog">
        <Dialog.Body>
          <Button
            variant="ghost"
            icon={<IconSettings />}
            aria-label="Dialog settings"
            data-t="g"
          />
        </Dialog.Body>
      </Dialog.Popup>
    </Dialog.Root>
    <Ready />
  </TooltipProvider>,
);
