import { useMessages } from "../lib/i18n/index.js"
import { windowsMessages } from "./messages.js"
/**
 * Window scopes (R14.4): windows and the dock sit above the tenant scope. Each window records
 * the organisation it belongs to (WindowEntry.scope); the workspace only labels it. When a
 * window's scope is not the one the user is in, its app bar shows the scope chip, and the dock
 * groups windows by scope behind each group's avatar. Switching scope never closes, pauses or
 * reloads a window: nothing here is wired to anything but presentation.
 *
 * The window layer does not know what an organisation is. The application provides the
 * current scope and how to draw one (a name and an avatar, or its own chip and icon) through
 * WindowScopeProvider, or the `scopes` prop of Workspace and PopoutWindow.
 */
import { createContext, useContext, type ReactNode } from "react"
import { Tooltip } from "../ui/tooltip/index.js"

export interface WindowScopeInfo {
  /** The scope's name: "Northstar Studio". Names the chip, dock group and tooltips even when `chip` and `icon` draw them. */
  label: string
  /** A small avatar (an organisation tile), drawn at the chip and dock group's size. */
  avatar?: ReactNode
  /**
   * The application's own chip for the scope, shown in the app bar in place of the library's
   * avatar-and-name pill, so a scope renders through the same identity component everywhere.
   * Keep it non-interactive: the chip is part of the app bar's drag surface, and it is hidden
   * from assistive technology, which reads `label`. Pass `icon` too for narrow windows.
   */
  chip?: ReactNode
  /**
   * The application's own avatar-only form of the scope: the app bar chip in a narrow window,
   * the dock group and the phone window switcher's group heading. Drawn as given, without the
   * library's pill; falls back to `avatar`. Non-interactive, like `chip`. These slots set
   * `--tile-icon-box` to the chip's height, so a library tile (EntityIdentity's icon tier)
   * fits; size anything else to `--control-h-xs`.
   */
  icon?: ReactNode
}

export interface WindowScopes {
  /** The scope the user is in (an organisation id), or null when unscoped (all of them). */
  current: string | null
  /** Name and avatar for a scope id; undefined for one the user can no longer see. */
  describe: (scope: string) => WindowScopeInfo | undefined
}

const WindowScopeContext = createContext<WindowScopes | null>(null)

/** Supplies the current scope and how to draw a scope to the window layer's scope chips and dock groups. A null or undefined `value` turns scope labelling off. */
export function WindowScopeProvider({ value, children }: { value: WindowScopes | null | undefined; children: ReactNode }) {
  return <WindowScopeContext value={value ?? null}>{children}</WindowScopeContext>
}

/** Returns the scopes from the enclosing `WindowScopeProvider`, or null when none is provided. */
export function useWindowScopes(): WindowScopes | null {
  return useContext(WindowScopeContext)
}

/** Describe a window's scope, falling back to its id so a window never loses its label. */
export function describeScope(scopes: WindowScopes | null, scope: string | null): WindowScopeInfo | null {
  if (!scope) return null
  return scopes?.describe(scope) ?? { label: scope }
}

/**
 * The scope chip in a window's app bar: the organisation's avatar and name, shown only when
 * the window belongs to a scope other than the current one. Narrow windows keep the avatar,
 * and the tooltip names it. Part of the app bar's drag surface, like the title.
 *
 * When the scope has a `chip` (WindowScopeInfo), that is drawn instead of the pill, and
 * `icon` replaces it in a narrow window.
 */
export function WindowScopeChip({ scope }: {
  /** The window's scope id (`WindowEntry.scope`), or null for an unscoped window, which shows no chip. */
  scope: string | null
}) {
  const messages = useMessages(windowsMessages)

  const scopes = useWindowScopes()
  if (!scope || !scopes || scope === scopes.current) return null
  const info = describeScope(scopes, scope)
  if (!info) return null
  return (
    <Tooltip content={info.label}>
      <span
        className="fa-window-scope"
        data-scope={scope}
        data-chip={info.chip ? "" : undefined}
        data-icon={info.icon ? "" : undefined}
        role="img"
        aria-label={messages.organisation(info.label)}
      >
        {info.chip ? (
          <span className="fa-window-scope-chip" aria-hidden>
            {info.chip}
          </span>
        ) : (
          <>
            {info.avatar ? (
              <span className="fa-window-scope-avatar" aria-hidden>
                {info.avatar}
              </span>
            ) : null}
            <span className="fa-window-scope-label" aria-hidden>
              {info.label}
            </span>
          </>
        )}
        {info.icon ? (
          <span className="fa-window-scope-icon" aria-hidden>
            {info.icon}
          </span>
        ) : null}
      </span>
    </Tooltip>
  )
}
