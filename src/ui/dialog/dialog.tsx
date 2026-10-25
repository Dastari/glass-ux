import { useMessages } from "../../lib/i18n/index.js"
import { dialogMessages } from "./messages.js"
import { Dialog as BaseDialog } from "@base-ui/react/dialog"
import { Drawer } from "@base-ui/react/drawer"
import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"
import { IconClose } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { Button } from "../button/index.js"
import { usePhoneLayout } from "../../lib/use-media-query.js"
import { popupContainer } from "../../lib/popup-container.js"

export type DialogSize = "sm" | "md" | "lg" | "xl" | "full"
/** dialog: centred · sheet: phone bottom sheet · side: a panel from a screen edge (Sheet) */
export type DialogMode = "dialog" | "sheet" | "side"
export type DialogKind = "dialog" | "alert" | "settings" | "side" | "palette"
export type DialogTone = "default" | "accent" | "success" | "warning" | "danger" | "info"

export type DialogChangeDetails =
  BaseDialog.Root.ChangeEventDetails | Drawer.Root.ChangeEventDetails

/** Whether parts render as a centred dialog or a phone bottom sheet. */
const ModeContext = createContext<DialogMode>("dialog")
/** How many dialogs enclose this one (R13.3: at most two). */
const DepthContext = createContext(0)

interface FrameValue {
  setEdges: (top: boolean, bottom: boolean) => void
}
/** Lets the scrolling Body tell its frame when content runs under the header or footer. */
const FrameContext = createContext<FrameValue | null>(null)

/**
 * Set inside Dialog.Preview: parts render as plain markup (no dialog behaviour, no focus
 * guards, no dialog role) with the same classes, so specimens look identical.
 */
const PreviewContext = createContext<{ titleId: string; descriptionId: string } | null>(null)

type PartProps = { className?: string; children?: ReactNode }

/** The dialog's title: Base UI's (labels the popup) live, a heading in previews. */
export function DialogTitlePart({ className, children }: PartProps) {
  const preview = useContext(PreviewContext)
  if (preview) {
    return (
      <h2 id={preview.titleId} className={className}>
        {children}
      </h2>
    )
  }
  return <BaseDialog.Title className={className}>{children}</BaseDialog.Title>
}

/** The dialog's description: describes the popup live, a paragraph in previews. */
export function DialogDescriptionPart({ className, children }: PartProps) {
  const preview = useContext(PreviewContext)
  if (preview) {
    return (
      <p id={preview.descriptionId} className={className}>
        {children}
      </p>
    )
  }
  return <BaseDialog.Description className={className}>{children}</BaseDialog.Description>
}

/** A control that closes the dialog; inert in previews. */
export function DialogClosePart({
  className,
  render,
}: {
  className?: string
  render: ReactElement
}) {
  const preview = useContext(PreviewContext)
  if (preview)
    return cloneElement(render as ReactElement<{ className?: string; tabIndex?: number }>, {
      className,
      tabIndex: -1,
    })
  return <BaseDialog.Close className={className} render={render} />
}

/** Returns how the enclosing dialog renders: `"dialog"` (centred, the default outside any dialog), `"sheet"` (phone bottom sheet) or `"side"`. */
export function useDialogMode() {
  return useContext(ModeContext)
}

/* ── Root ───────────────────────────────────────────────────────────────────── */

export interface DialogRootProps {
  open?: boolean
  defaultOpen?: boolean
  /** Called with the next open state and Base UI change details (the reason; `details.cancel()` keeps it open) when the trigger, Esc, an outside press, a close control or a sheet swipe opens or dismisses it. Pair with `open` to control it. */
  onOpenChange?: (open: boolean, details: DialogChangeDetails) => void
  /** Called with the final open state once the open or close animation has finished. */
  onOpenChangeComplete?: (open: boolean) => void
  /** Default true. `false` lets the page stay interactive (rare; prefer a Popover or Sheet). */
  modal?: boolean
  /** Keep the dialog open on outside press (Esc still closes). */
  disablePointerDismissal?: boolean
  /** Ref exposing the component’s imperative action contract. */
  actionsRef?: RefObject<{ unmount: () => void; close: () => void } | null>
  /**
   * `auto` (default) renders a bottom sheet with a grab handle on phones (< 48rem) and a
   * centred dialog elsewhere (R13.4). Force either with true/false.
   */
  sheet?: "auto" | boolean
  children?: ReactNode
}

function DialogRoot({ sheet = "auto", children, ...rest }: DialogRootProps) {
  const phone = usePhoneLayout()
  const asSheet = sheet === "auto" ? phone : sheet
  const depth = useContext(DepthContext) + 1
  useEffect(() => {
    if (import.meta.env.DEV && depth > 2)
      console.warn("Dialog: dialogs stack at most two deep (R13.3). Open a window instead.")
  }, [depth])
  const Root = asSheet ? Drawer.Root : BaseDialog.Root
  return (
    <DepthContext value={depth}>
      <ModeContext value={asSheet ? "sheet" : "dialog"}>
        <Root {...rest}>{children}</Root>
      </ModeContext>
    </DepthContext>
  )
}

/* ── Surface ────────────────────────────────────────────────────────────────── */

export interface DialogPopupProps {
  /** sm 400 · md 560 · lg 760 · xl 1040 · full. Ignored by phone sheets (full width). */
  size?: DialogSize
  /** `settings` fixes the height so switching sections never resizes the dialog. */
  kind?: DialogKind
  className?: string
  children?: ReactNode
  /** The element or behaviour to focus when the overlay opens. By default a keyboard open focuses the first control outside the header close button (or the popup), and a touch open focuses the popup. */
  initialFocus?: ComponentProps<typeof BaseDialog.Popup>["initialFocus"]
  /** The element or behaviour to focus when the overlay closes. */
  finalFocus?: ComponentProps<typeof BaseDialog.Popup>["finalFocus"]
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
}

interface SurfaceProps extends DialogPopupProps {
  /** Active display or interaction mode. */
  mode: DialogMode
  /** `side` mode only: the edge the panel slides in from (Sheet's `side`). */
  edge?: "left" | "right" | "bottom"
}

const TABBABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]'

/**
 * Where a centred dialog puts focus when it opens by keyboard: its first tabbable control
 * outside the header close button, else the popup. On the close button its focus-visible
 * tooltip would show at once, and Escape would read as dismissing that before the dialog.
 * A touch open focuses the popup, so no on-screen keyboard rises (Base UI's default).
 */
function initialDialogFocus(popup: HTMLElement | null, interaction: string) {
  if (!popup || interaction === "touch") return popup
  for (const element of popup.querySelectorAll<HTMLElement>(TABBABLE)) {
    if (element.tabIndex < 0 || element.matches(":disabled") || !element.getClientRects().length) continue
    if (element.closest(".fa-dialog-close, [inert], [hidden]")) continue
    return element
  }
  return popup
}

/**
 * Backdrop + viewport + glass popup, for every modal surface (Dialog, AlertDialog,
 * Sheet, the command palette). Internal; consumers use Dialog.Popup.
 */
export function DialogSurface({
  mode,
  edge = "right",
  kind = "dialog",
  size = "md",
  className,
  children,
  initialFocus,
  ...rest
}: SurfaceProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const [edges, setEdgeState] = useState({ top: false, bottom: false })
  const frame = useMemo<FrameValue>(
    () => ({
      setEdges: (top, bottom) =>
        setEdgeState((prev) =>
          prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
        ),
    }),
    []
  )
  const data = {
    "data-kind": kind,
    "data-size": size,
    "data-scrolled-top": edges.top ? "" : undefined,
    "data-scrolled-bottom": edges.bottom ? "" : undefined,
  }
  const content = <FrameContext value={frame}>{children}</FrameContext>

  if (mode === "side") {
    return (
      <ModeContext value="side">
        <Drawer.Portal container={popupContainer()}>
          <Drawer.Backdrop className="glass-scrim fa-scrim" />
          <Drawer.Viewport className="fa-dialog-side-viewport" data-edge={edge}>
            <Drawer.Popup
              {...rest}
              {...data}
              initialFocus={initialFocus}
              data-edge={edge}
              className={cx("glass-overlay fa-dialog", className)}
            >
              {edge === "bottom" ? <span className="fa-dialog-handle" aria-hidden /> : null}
              <Drawer.Content className="fa-dialog-content">{content}</Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </ModeContext>
    )
  }
  if (mode === "sheet") {
    return (
      <ModeContext value="sheet">
        <Drawer.Portal container={popupContainer()}>
          <Drawer.Backdrop className="glass-scrim fa-scrim" />
          <Drawer.Viewport className="fa-dialog-sheet-viewport">
            <Drawer.Popup
              {...rest}
              {...data}
              initialFocus={initialFocus}
              data-sheet=""
              className={cx("glass-overlay fa-dialog", className)}
            >
              <span className="fa-dialog-handle" aria-hidden />
              <Drawer.Content className="fa-dialog-content">{content}</Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </ModeContext>
    )
  }
  return (
    <ModeContext value="dialog">
      <BaseDialog.Portal container={popupContainer()}>
        <BaseDialog.Backdrop className="glass-scrim fa-scrim" />
        <BaseDialog.Viewport className="fa-dialog-viewport" data-kind={kind}>
          <BaseDialog.Popup
            {...rest}
            {...data}
            ref={popupRef}
            initialFocus={initialFocus ?? ((interaction) => initialDialogFocus(popupRef.current, interaction))}
            className={cx("glass-overlay fa-dialog", className)}
          >
            {content}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </ModeContext>
  )
}

/** The dialog surface: header, a scrolling body and a pinned footer. */
function DialogPopup(props: DialogPopupProps) {
  return <DialogSurface {...props} mode={useContext(ModeContext)} />
}

/* ── Parts ──────────────────────────────────────────────────────────────────── */

export interface DialogHeaderProps extends Omit<ComponentProps<"header">, "title"> {
  /** Icon in a tile, sized by the header. */
  icon?: ReactNode
  /** Replaces the icon tile with the caller's own: an entity's identity tile (its photo, state). */
  media?: ReactNode
  tone?: DialogTone
  title: ReactNode
  /** Data only: the target's identifier or context (R2.2), never a restatement. */
  subtitle?: ReactNode
  /** Show the close button (default). */
  close?: boolean
}

function DialogHeader({
  icon,
  media,
  tone = "default",
  title,
  subtitle,
  close = true,
  className,
  children,
  ...rest
}: DialogHeaderProps) {
  const messages = useMessages(dialogMessages)

  return (
    <header {...rest} className={cx("fa-dialog-header", className)}>
      {media ? (
        <span className="fa-dialog-media">{media}</span>
      ) : icon ? (
        <span className="fa-tile-icon" data-tone={tone === "default" ? undefined : tone}>
          {icon}
        </span>
      ) : null}
      <div className="fa-dialog-heading">
        <DialogTitlePart className="fa-dialog-title">{title}</DialogTitlePart>
        {subtitle ? (
          <DialogDescriptionPart className="fa-dialog-subtitle">{subtitle}</DialogDescriptionPart>
        ) : null}
      </div>
      {children ? <div className="fa-dialog-header-actions">{children}</div> : null}
      {close ? (
        <DialogClosePart
          className="fa-dialog-close"
          render={<Button variant="ghost" size="sm" icon={<IconClose />} aria-label={messages.close} />}
        />
      ) : null}
    </header>
  )
}

export interface DialogBodyProps extends Omit<ComponentProps<"div">, "ref"> {
  /** Remove the body's inset, for content that brings its own (a rail layout, a table). */
  flush?: boolean
}

/**
 * The only part that scrolls. It is an inline-size container, so its content lays out
 * against the dialog's width. While content runs under the header or footer, that edge
 * shows a hairline (R5.8).
 *
 * A form dialog wraps the body and footer in one `<Form>` (or `<form>`) placed directly in
 * `Dialog.Popup`, so Enter and the footer's submit button submit it. The form continues the
 * dialog's column: the body still scrolls and the footer stays visible on short screens.
 */
function DialogBody({ flush, className, children, ...rest }: DialogBodyProps) {
  const ref = useRef<HTMLDivElement>(null)
  const edges = useScrollEdges(ref)
  const frame = useContext(FrameContext)
  useEffect(() => {
    frame?.setEdges(edges.top, edges.bottom)
  }, [frame, edges.top, edges.bottom])
  return (
    <div
      {...rest}
      ref={ref}
      className={cx("fa-dialog-body", className)}
      data-flush={flush ? "" : undefined}
    >
      {children}
    </div>
  )
}

/** Report scroll edges from a custom scrolling region (palette list, settings pane). */
export function useDialogScrollEdges(ref: RefObject<HTMLElement | null>) {
  const edges = useScrollEdges(ref)
  const frame = useContext(FrameContext)
  useEffect(() => {
    frame?.setEdges(edges.top, edges.bottom)
  }, [frame, edges.top, edges.bottom])
  return edges
}

export interface DialogFooterProps extends ComponentProps<"footer"> {
  /** Tertiary actions on the left (Reset, Help). The primary always goes last, on the right. */
  start?: ReactNode
}

function DialogFooter({ start, className, children, ...rest }: DialogFooterProps) {
  return (
    <footer {...rest} className={cx("fa-dialog-footer", className)}>
      {start ? <div className="fa-dialog-footer-start">{start}</div> : null}
      {children}
    </footer>
  )
}

/* ── Preview ────────────────────────────────────────────────────────────────── */

/**
 * The dialog surface rendered in the page flow, open and non-modal, for documentation
 * and screenshots. It is the real component (title, focus order, scroll edges), only
 * portalled into place instead of over the viewport.
 */
function DialogPreview({
  size = "md",
  kind = "dialog",
  height = "auto",
  className,
  children,
}: {
  size?: DialogSize
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind?: DialogKind
  /** `short` fixes a low frame so the body scrolls (to show the scroll edges). */
  height?: "auto" | "short"
  className?: string
  children: ReactNode
}) {
  const titleId = useId()
  const descriptionId = useId()
  const preview = useMemo(() => ({ titleId, descriptionId }), [titleId, descriptionId])
  const [edges, setEdgeState] = useState({ top: false, bottom: false })
  const frame = useMemo<FrameValue>(
    () => ({
      setEdges: (top, bottom) =>
        setEdgeState((prev) =>
          prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
        ),
    }),
    []
  )
  return (
    <div className={cx("fa-dialog-preview", className)} data-size={size} data-height={height}>
      <div
        role="group"
        aria-labelledby={titleId}
        className="glass-overlay fa-dialog"
        data-kind={kind}
        data-size={size}
        data-scrolled-top={edges.top ? "" : undefined}
        data-scrolled-bottom={edges.bottom ? "" : undefined}
      >
        <PreviewContext value={preview}>
          <ModeContext value="dialog">
            <FrameContext value={frame}>{children}</FrameContext>
          </ModeContext>
        </PreviewContext>
      </div>
    </div>
  )
}

/**
 * A modal dialog built from parts: `Root` (state; a bottom sheet on phones by default),
 * `Trigger`, `Popup`, `Header`, `Body` (scrolls), `Footer`, `Title`, `Description` and
 * `Close`. `Preview` renders the same parts statically for documentation.
 */
export const Dialog = {
  Root: DialogRoot,
  Trigger: BaseDialog.Trigger,
  Popup: DialogPopup,
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
  Title: DialogTitlePart,
  Description: DialogDescriptionPart,
  Close: BaseDialog.Close,
  Preview: DialogPreview,
}

export { BaseDialog as DialogPrimitive }
