import { TruncatedText } from "../ui/truncated-text/index.js";
import { PanelHeader } from "../ui/surface/index.js";
/**
 * Inspector — context beside the workspace: Assistant, the selected item's details.
 * Docked as a glass pane at 1280px and wider (open by default from 1920px, R5.4); a
 * slide-over sheet below that. Its open state persists (shell-state.ts).
 */
import {
  Activity,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { IconClose } from "../icons/generated/icons.js";
import { cx } from "../lib/cx.js";
import { scaledDuration } from "../lib/motion.js";
import { useScrollEdges } from "../lib/use-scroll-edges.js";
import { Button } from "../ui/button/index.js";
import { Sheet } from "../ui/sheet/index.js";
import { useShell } from "./app-shell.js";

export interface InspectorProps {
  title: string;
  /** Under the title, as data: what the pane is showing ("North studio printing and offline PCs"). */
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Header actions (ghost sm buttons), before the close button. */
  actions?: ReactNode;
  /** Pinned to the bottom (a composer, a primary action). */
  footer?: ReactNode;
  /**
   * The child fills the body edge to edge and scrolls itself: a ConversationLog, which brings
   * its own scroller, floating composer and ask dock. Default: a padded scrolling column.
   */
  fill?: boolean;
  children: ReactNode;
  className?: string;
}

function InspectorPane({
  title,
  subtitle,
  icon,
  actions,
  footer,
  fill = false,
  children,
  className,
  open,
  onClose,
}: InspectorProps & { open: boolean; onClose: () => void }) {
  const paneRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(bodyRef);
  const hidden = useCollapsed(paneRef, open);
  return (
    <aside
      ref={paneRef}
      className={cx("glass-panel fa-shell-inspector", className)}
      aria-label={title}
    >
      {/* Collapsed, the content keeps its state but stops rendering and running effects. The
          pane itself stays displayed so it can slide; its scrollers keep their positions. */}
      <Activity mode={hidden ? "hidden" : "visible"}>
        <PanelHeader
          title={<TruncatedText>{title}</TruncatedText>}
          description={subtitle}
          icon={icon}
          actions={
            <>
              {actions}
              <Button
                variant="ghost"
                size="sm"
                icon={<IconClose />}
                aria-label="Hide inspector"
                onClick={onClose}
              />
            </>
          }
          data-scrolled={edges.top ? "" : undefined}
        />

        <div
          ref={bodyRef}
          className="fa-shell-inspector-body"
          data-fill={fill ? "" : undefined}
          data-scroll-container={fill ? undefined : ""}
          data-scrolled-top={edges.top ? "" : undefined}
          data-scrolled-bottom={edges.bottom ? "" : undefined}
        >
          {children}
        </div>
        {footer ? (
          <footer
            className="fa-shell-inspector-footer"
            data-scrolled={edges.bottom ? "" : undefined}
          >
            {footer}
          </footer>
        ) : null}
      </Activity>
    </aside>
  );
}

/** The pane's slide (app-shell.css, --duration-base at full motion). */
const SLIDE_MS = 200;

/**
 * Whether a docked pane's content is put away: at once on mount when closed; once the pane
 * has slid out when it closes (its transform transition ends, or the base duration passes);
 * never while open, so opening shows the content in the same render.
 */
function useCollapsed(paneRef: RefObject<HTMLElement | null>, open: boolean) {
  const [hidden, setHidden] = useState(!open);
  if (open && hidden) setHidden(false);
  useEffect(() => {
    const pane = paneRef.current;
    if (open || !pane) return;
    const done = () => setHidden(true);
    const onEnd = (event: TransitionEvent) => {
      if (event.target === pane && event.propertyName === "transform") done();
    };
    pane.addEventListener("transitionend", onEnd);
    const fallback = setTimeout(done, scaledDuration(SLIDE_MS) + 100);
    return () => {
      pane.removeEventListener("transitionend", onEnd);
      clearTimeout(fallback);
    };
  }, [paneRef, open]);
  return hidden;
}

/** Docked: a glass pane. Narrower than 80rem: the same content in a Sheet. */
export function Inspector(props: InspectorProps) {
  const shell = useShell();
  if (shell.inspectorDocked)
    return (
      <InspectorPane
        {...props}
        open={shell.inspectorOpen}
        onClose={() => shell.setInspectorOpen(false)}
      />
    );
  const {
    title,
    subtitle,
    icon,
    actions,
    footer,
    fill = false,
    children,
  } = props;
  return (
    <Sheet.Root
      open={shell.inspectorOpen}
      onOpenChange={(open) => shell.setInspectorOpen(open)}
    >
      <Sheet.Popup size="md" aria-label={title}>
        <Sheet.Header
          icon={
            icon ? (
              <span className="fa-shell-inspector-icon">{icon}</span>
            ) : undefined
          }
          title={title}
          subtitle={subtitle}
        >
          {actions}
        </Sheet.Header>
        {fill ? (
          <div className="fa-shell-inspector-body" data-fill="">
            {children}
          </div>
        ) : (
          <Sheet.Body>{children}</Sheet.Body>
        )}
        {footer ? (
          <Sheet.Footer>
            <div className="fa-shell-inspector-sheet-footer">{footer}</div>
          </Sheet.Footer>
        ) : null}
      </Sheet.Popup>
    </Sheet.Root>
  );
}
