/**
 * WindowFrame — a view in a frame (R14.1).
 *
 *   AppBar     icon, title, data subtitle, scope chip, actions slot, window controls
 *   Body       container-aware (container-type: size); scrolls inside, or fills edge to edge
 *   StatusBar  live state: StatusItem (dot + label) and StatusMeta (right-aligned), joined
 *              with "·", never with lines
 *
 * The frame is presentational. ManagedWindow (workspace), PrimaryWindow (the routed view),
 * PopoutWindow (its own browser window) and gallery specimens all render it, so a window
 * looks the same wherever it is.
 */
import { useRef, type ComponentProps, type ReactNode, type Ref } from "react";
import {
  IconClose,
  IconFullscreen,
  IconFullscreenExit,
  IconMaximise,
  IconMinimise,
  IconPopIn,
  IconPopOut,
  IconRestore,
} from "../icons/generated/icons.js";
import { cx } from "../lib/cx.js";
import { useScrollEdges } from "../lib/use-scroll-edges.js";
import { StatusDot } from "../ui/badge/index.js";
import { TruncatedText } from "../ui/truncated-text/index.js";
import { Button } from "../ui/button/index.js";
import { ActionsOverflow } from "./window-actions.js";
import {
  WINDOW_TONE_STATUS,
  type WindowLayout,
  type WindowStatusTone,
} from "./types.js";

export type WindowFrameState =
  WindowLayout | "minimised" | "popout" | "sheet" | "primary";

export interface WindowFrameRootProps extends ComponentProps<"section"> {
  /** The focused window has a stronger edge; others dim their app bar. */
  focused?: boolean;
  /** Controlled view state, including loading, empty and error states. */
  state?: WindowFrameState;
  /**
   * `panel` (default): a glass frame, for secondary windows. `none`: no frame, for the
   * primary window, whose header, tabs and status sit on the canvas and whose content
   * panels carry the glass.
   */
  material?: "panel" | "none";
}

function Root({
  focused = false,
  state,
  material = "panel",
  className,
  children,
  ...rest
}: WindowFrameRootProps) {
  return (
    <section
      {...rest}
      className={cx(
        material === "panel" && "glass-panel",
        "fa-window",
        className,
      )}
      data-material={material}
      data-focused={focused ? "" : undefined}
      data-state={state}
    >
      {children}
    </section>
  );
}

export interface WindowAppBarProps extends Omit<
  ComponentProps<"header">,
  "title"
> {
  icon?: ReactNode;
  title: ReactNode;
  /** Data only (R2.2): the endpoint or organisation the window is about. */
  subtitle?: ReactNode;
  /** The window's organisation when it is not the current one (WindowScopeChip, R14.4). */
  scope?: ReactNode;
  /** Window-specific actions, before the controls. Ghost sm buttons; `Window.Action` gives one a priority so it can fold into More. */
  actions?: ReactNode;
  /** Window controls (WindowControls). */
  controls?: ReactNode;
  /** id for the title, so the frame can be labelled by it. */
  titleId?: string;
  /** Receives the actions container, for content that portals its own actions in. */
  actionsRef?: Ref<HTMLDivElement>;
}

function AppBar({
  icon,
  title,
  subtitle,
  scope,
  actions,
  controls,
  titleId,
  actionsRef,
  className,
  ...rest
}: WindowAppBarProps) {
  return (
    <header {...rest} className={cx("fa-window-appbar", className)}>
      {icon ? (
        <span className="fa-tile-icon fa-window-icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <div className="fa-window-heading">
        <h2 className="fa-window-title" id={titleId}>
          <TruncatedText>{title}</TruncatedText>
        </h2>
        {subtitle ? (
          <p className="fa-window-subtitle">
            <TruncatedText>{subtitle}</TruncatedText>
          </p>
        ) : null}
      </div>
      {scope}
      <div
        ref={actionsRef}
        className="fa-window-actions"
        data-window-no-drag=""
      >
        {actions ? <ActionsOverflow>{actions}</ActionsOverflow> : null}
      </div>
      {controls}
    </header>
  );
}

export interface WindowBodyProps extends ComponentProps<"div"> {
  /** `scroll` pads and scrolls (documents, lists); `fill` is edge to edge (viewers). */
  variant?: "scroll" | "fill";
}

/**
 * The window body. A size container named `window-body`, so content adapts to the box it
 * is given on both axes (R7). Scroll bodies show the app bar and status bar edges only
 * while content passes beneath them (R5.8).
 */
function Body({
  variant = "scroll",
  className,
  children,
  ...rest
}: WindowBodyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scrolls = variant === "scroll";
  // The frame mirrors the edges, so its app bar and status bar rules need no :has().
  const edges = useScrollEdges(ref, { root: scrolls ? ".fa-window" : undefined });
  // While content overflows, the body takes keyboard focus so it can be scrolled without
  // a pointer (WCAG 2.1.1), even when nothing inside it is focusable.
  const overflowing = scrolls && (edges.top || edges.bottom);
  return (
    <div
      ref={ref}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be keyboard reachable (axe scrollable-region-focusable)
      tabIndex={overflowing ? 0 : undefined}
      {...rest}
      className={cx("fa-window-body", className)}
      data-variant={variant}
      data-scroll-container={scrolls ? "" : undefined}
      data-scrolled-top={scrolls && edges.top ? "" : undefined}
      data-scrolled-bottom={scrolls && edges.bottom ? "" : undefined}
    >
      {children}
    </div>
  );
}

export interface WindowStatusBarProps extends ComponentProps<"footer"> {
  /**
   * `hide` drops the bar in a phone-width window (under 30rem), for a primary view whose
   * bar only adds detail there is no room for. Live state that matters on a phone
   * (connection lost, reconnecting) keeps the default, `show`.
   */
  narrow?: "show" | "hide";
}

function StatusBar({
  narrow = "show",
  className,
  ...rest
}: WindowStatusBarProps) {
  return (
    <footer
      {...rest}
      className={cx("fa-window-status", className)}
      data-narrow={narrow === "hide" ? "hide" : undefined}
    />
  );
}

export interface StatusItemProps extends ComponentProps<"span"> {
  /** Draws a status dot before the label. */
  tone?: WindowStatusTone;
}

/** One fact in the status bar. Items are joined with "·". */
function StatusItem({ tone, className, children, ...rest }: StatusItemProps) {
  return (
    <span
      {...rest}
      className={cx("fa-window-status-item", className)}
      data-tone={tone}
    >
      {tone ? <StatusDot status={WINDOW_TONE_STATUS[tone]} /> : null}
      <TruncatedText className="fa-window-status-label">
        {children}
      </TruncatedText>
    </span>
  );
}

/** Right-aligned metadata (resolution, latency, counts). Its items are joined with "·". */
function StatusMeta({ className, ...rest }: ComponentProps<"span">) {
  return (
    <span
      {...rest}
      className={cx("fa-window-status-meta", className)}
      data-numeric
    />
  );
}

/** Live region for status bars that report changes (connection lost, reconnecting). */
function StatusGroup({ className, ...rest }: ComponentProps<"span">) {
  return (
    <span
      role="status"
      {...rest}
      className={cx("fa-window-status-group", className)}
    />
  );
}

export interface WindowControlsProps {
  title: string;
  /** Whether the window fills its available workspace. */
  maximised?: boolean;
  /** Called when the person presses Pop out. The button is shown only when this is supplied and not `compact`. */
  onPopOut?: () => void;
  /** Whether the window is in full screen: the control reads "Exit full screen". */
  fullscreen?: boolean;
  /** Called when the person presses Full screen or Exit full screen. The button is shown only when this is supplied and not `compact`. */
  onToggleFullscreen?: () => void;
  /** Called when the person presses Minimise. The button is shown only when this is supplied. */
  onMinimise?: () => void;
  /** Called when the person presses Maximise or Restore (per `maximised`). The button is shown only when this is supplied and not `compact`. */
  onToggleMaximise?: () => void;
  /** Called when the person presses Close; run close guards before removing the window. The button is shown only when this is supplied. */
  onClose?: () => void;
  /** Popped-out windows offer "Return to workspace" in place of pop-out. */
  onReturn?: () => void;
  /** Phones: minimise reads as "back to workspace" and maximise is implicit. */
  compact?: boolean;
  /** Extra controls before the standard ones (the phone window switcher). */
  leading?: ReactNode;
}

/** Pop out, full screen, minimise, maximise/restore and close, as ghost icon buttons. */
function Controls({
  title,
  maximised = false,
  onPopOut,
  fullscreen = false,
  onToggleFullscreen,
  onMinimise,
  onToggleMaximise,
  onClose,
  onReturn,
  compact = false,
  leading,
}: WindowControlsProps) {
  // Icon-only Buttons: Button shows the aria-label as a tooltip.
  const control = (
    label: string,
    icon: ReactNode,
    onClick: () => void,
    name: string,
  ) => (
    <Button
      variant="ghost"
      size="sm"
      icon={icon}
      aria-label={`${label} ${title}`}
      data-control={name}
      onClick={onClick}
    />
  );
  return (
    <div
      className="fa-window-controls"
      role="group"
      aria-label="Window controls"
      data-window-no-drag=""
    >
      {leading}
      {onReturn
        ? control("Return to workspace", <IconPopIn />, onReturn, "return")
        : null}
      {onPopOut && !compact
        ? control("Pop out", <IconPopOut />, onPopOut, "popout")
        : null}
      {onToggleFullscreen && !compact
        ? control(
            fullscreen ? "Exit full screen" : "Full screen",
            fullscreen ? <IconFullscreenExit /> : <IconFullscreen />,
            onToggleFullscreen,
            "fullscreen",
          )
        : null}
      {onMinimise
        ? control("Minimise", <IconMinimise />, onMinimise, "minimise")
        : null}
      {onToggleMaximise && !compact
        ? control(
            maximised ? "Restore" : "Maximise",
            maximised ? <IconRestore /> : <IconMaximise />,
            onToggleMaximise,
            "maximise",
          )
        : null}
      {onClose ? control("Close", <IconClose />, onClose, "close") : null}
    </div>
  );
}

/**
 * The presentational parts of a window: `Root`, `AppBar` (icon, title, scope, actions and
 * controls), `Body`, `StatusBar` with `StatusItem`, `StatusMeta` and `StatusGroup` (a live
 * region), and `Controls`. It holds no window state; the workspace and pop-out wire it to
 * the manager.
 */
export const WindowFrame = {
  Root,
  AppBar,
  Body,
  StatusBar,
  StatusItem,
  StatusMeta,
  StatusGroup,
  Controls,
};
