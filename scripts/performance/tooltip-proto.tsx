// Prototype costs of three tooltip designs, 300 triggers each (not shipped).
import { createRoot } from "react-dom/client";
import { useLayoutEffect } from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";

const params = new URLSearchParams(location.search);
const kind = params.get("proto") ?? "root";
const handle = BaseTooltip.createHandle<string>();

function Triggers() {
  return (
    <BaseTooltip.Provider delay={500} closeDelay={0} timeout={400}>
      {kind === "handle" ? (
        <BaseTooltip.Root handle={handle}>
          {({ payload }) => (
            <BaseTooltip.Portal>
              <BaseTooltip.Positioner>
                <BaseTooltip.Popup>{payload}</BaseTooltip.Popup>
              </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
          )}
        </BaseTooltip.Root>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {Array.from({ length: 300 }, (_, i) =>
          kind === "root" ? (
            <BaseTooltip.Root key={i} disableHoverablePopup>
              <BaseTooltip.Trigger
                render={<button type="button" aria-label={`Sample ${i}`} />}
                delay={500}
              />
              <BaseTooltip.Portal>
                <BaseTooltip.Positioner>
                  <BaseTooltip.Popup>Sample {i}</BaseTooltip.Popup>
                </BaseTooltip.Positioner>
              </BaseTooltip.Portal>
            </BaseTooltip.Root>
          ) : kind === "handle" ? (
            <BaseTooltip.Trigger
              key={i}
              handle={handle}
              payload={`Sample ${i}`}
              render={<button type="button" aria-label={`Sample ${i}`} />}
              delay={500}
            />
          ) : (
            <button
              key={i}
              type="button"
              aria-label={`Sample ${i}`}
              data-tooltip={`Sample ${i}`}
            />
          ),
        )}
      </div>
    </BaseTooltip.Provider>
  );
}

const root = createRoot(document.getElementById("root")!);
(window as unknown as { __mount: () => Promise<number> }).__mount = () =>
  new Promise((resolve) => {
    const start = performance.now();
    function Done() {
      useLayoutEffect(() => {
        const ms = performance.now() - start;
        setTimeout(() => resolve(ms), 0);
      }, []);
      return null;
    }
    root.render(
      <>
        <Triggers />
        <Done />
      </>,
    );
  });
window.__ready = true;
