import { Badge } from "../ui/badge/index.js";
/**
 * The dock (R14.4): open windows with a live status dot. It appears only when windows
 * exist. Click restores or focuses (and minimises the focused window), middle-click
 * closes. On phones the same list opens as a switcher sheet.
 *
 * Entries are icons: the window kind's icon with its live status dot. Every entry has a
 * tooltip (R20.5) and an accessible name that says kind, subject and organisation
 * ("Terminal · NST-C106 · Northstar Studio"), so two windows of one kind for
 * different subjects are told apart. With scopes (Workspace `scopes`), windows are grouped by
 * organisation behind each group's avatar, in the order the groups first appeared, so a
 * client's windows stay together whichever organisation you are in.
 */
import type { MouseEvent } from "react";
import { IconClose, IconWindows } from "../icons/generated/icons.js";
import { StatusDot } from "../ui/badge/index.js";
import { Button } from "../ui/button/index.js";
import { Sheet } from "../ui/sheet/index.js";
import { ListRow } from "../ui/list-row/index.js";
import { Tooltip } from "../ui/tooltip/index.js";
import {
  useFocusedWindowId,
  useWindowIndicator,
  useWindowManager,
  useWindows,
} from "./react.js";
import { describeWindow } from "./registry.js";
import {
  describeScope,
  useWindowScopes,
  type WindowScopeInfo,
} from "./scope.js";
import type { WindowManager } from "./store.js";
import {
  PRIMARY_WINDOW_ID,
  WINDOW_TONE_STATUS,
  type WindowEntry,
} from "./types.js";

function activate(
  manager: WindowManager,
  entry: WindowEntry,
  focused: boolean,
) {
  if (entry.poppedOut) manager.focusPopout(entry.id);
  else if (entry.minimised) manager.restore(entry.id);
  else if (focused) manager.minimise(entry.id);
  else manager.focus(entry.id);
}

function stateText(entry: WindowEntry) {
  if (entry.poppedOut) return "In its own window";
  if (entry.minimised) return "Minimised";
  return undefined;
}

export interface WindowGroup {
  /** The scope id, or null for windows without one. */
  scope: string | null;
  info: WindowScopeInfo | null;
  windows: WindowEntry[];
}

/** Windows by scope, groups in order of first appearance, windows in dock order. */
export function groupWindowsByScope(
  windows: readonly WindowEntry[],
  describe: (scope: string | null) => WindowScopeInfo | null,
): WindowGroup[] {
  const groups = new Map<string, WindowGroup>();
  for (const entry of windows) {
    const key = entry.scope ?? "";
    let group = groups.get(key);
    if (!group)
      groups.set(
        key,
        (group = {
          scope: entry.scope,
          info: describe(entry.scope),
          windows: [],
        }),
      );
    group.windows.push(entry);
  }
  return [...groups.values()];
}

function DockItem({
  entry,
  focused,
  scope,
}: {
  entry: WindowEntry;
  focused: boolean;
  /** Tenant, organisation or entity scope supplied by the application. */
  scope: WindowScopeInfo | null;
}) {
  const manager = useWindowManager();
  const indicator = useWindowIndicator(entry.id);
  const {
    title,
    subtitle,
    icon: Icon,
  } = describeWindow(entry.kind, entry.params);
  const detail = [
    subtitle,
    scope?.label !== subtitle ? scope?.label : undefined,
    indicator?.label,
    stateText(entry),
  ]
    .filter(Boolean)
    .join(" · ");
  const active = focused && !entry.minimised && !entry.poppedOut;
  return (
    <li className="fa-wm-dock-entry">
      <Tooltip content={detail ? `${title} · ${detail}` : title} side="top">
        <button
          type="button"
          className="fa-pressable fa-lit fa-wm-dock-item"
          data-window-id={entry.id}
          data-active={active ? "" : undefined}
          data-minimised={entry.minimised ? "" : undefined}
          data-popped-out={entry.poppedOut ? "" : undefined}
          aria-current={active ? "true" : undefined}
          aria-label={detail ? `${title}, ${detail}` : title}
          onClick={() => activate(manager, entry, focused)}
          onMouseDown={(event: MouseEvent) => {
            if (event.button === 1) event.preventDefault();
          }}
          onAuxClick={(event: MouseEvent) => {
            if (event.button !== 1) return;
            event.preventDefault();
            void manager.close(entry.id);
          }}
        >
          <span className="fa-wm-dock-icon" aria-hidden>
            {Icon ? <Icon /> : null}
            {indicator ? (
              <StatusDot status={WINDOW_TONE_STATUS[indicator.tone]} overlay />
            ) : null}
          </span>
        </button>
      </Tooltip>
    </li>
  );
}

export function Dock({ onOpenSwitcher }: { onOpenSwitcher?: () => void }) {
  const windows = useWindows();
  const focusedId = useFocusedWindowId();
  const scopes = useWindowScopes();
  if (!windows.length) return null;
  const groups = groupWindowsByScope(windows, (scope) =>
    scopes ? describeScope(scopes, scope) : null,
  );
  return (
    <nav
      className="glass-chrome fa-wm-dock"
      aria-label="Open windows"
      data-scroll-x=""
      data-grouped={scopes ? "" : undefined}
    >
      <ul className="fa-wm-dock-list">
        {groups.map((group) => (
          <li
            key={group.scope ?? ""}
            className="fa-wm-dock-group"
            data-scope={group.scope ?? undefined}
            data-current={
              scopes && group.scope === scopes.current ? "" : undefined
            }
          >
            {group.info?.avatar ? (
              <Tooltip content={group.info.label}>
                <span className="fa-wm-dock-scope">{group.info.avatar}</span>
              </Tooltip>
            ) : null}
            <ul
              className="fa-wm-dock-group-list"
              aria-label={group.info?.label ?? "Windows"}
            >
              {group.windows.map((entry) => (
                <DockItem
                  key={entry.id}
                  entry={entry}
                  focused={focusedId === entry.id}
                  scope={group.info}
                />
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {onOpenSwitcher ? (
        <Button
          className="fa-wm-dock-switcher"
          variant="ghost"
          size="sm"
          icon={<IconWindows />}
          aria-label="All windows"
          onClick={onOpenSwitcher}
        />
      ) : null}
    </nav>
  );
}

/** Phones: every open window in a bottom sheet, plus the routed view. */
export function WindowSwitcher({
  open,
  onOpenChange,
  primaryLabel = "Current page",
}: {
  open: boolean;
  /** Called when open change occurs. The callback type specifies its arguments. */
  onOpenChange: (open: boolean) => void;
  /** Visible label for the primary action. */
  primaryLabel?: string;
}) {
  const manager = useWindowManager();
  const windows = useWindows();
  const focusedId = useFocusedWindowId();
  const scopes = useWindowScopes();
  const groups = groupWindowsByScope(windows, (scope) =>
    scopes ? describeScope(scopes, scope) : null,
  );
  const choose = (id: string) => {
    const entry = manager.get(id);
    if (id === PRIMARY_WINDOW_ID) manager.focus(id);
    else if (entry) activate(manager, entry, false);
    onOpenChange(false);
  };
  return (
    <Sheet.Root
      side="bottom"
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
    >
      <Sheet.Popup size="sm">
        <Sheet.Header title="Windows" />
        <Sheet.Body>
          <ul className="fa-wm-switcher-list">
            <li className="fa-wm-switcher-row">
              <ListRow
                title={primaryLabel}
                className="fa-wm-switcher-item"
                selected={focusedId === PRIMARY_WINDOW_ID}
                onClick={() => choose(PRIMARY_WINDOW_ID)}
              />
            </li>
            {groups.map((group) => (
              <li key={group.scope ?? ""} className="fa-wm-switcher-group">
                {group.info ? (
                  <span className="fa-popup-group-label fa-wm-switcher-group-label">
                    {group.info.avatar ? (
                      <span aria-hidden>{group.info.avatar}</span>
                    ) : null}
                    {group.info.label}
                  </span>
                ) : null}
                <ul
                  className="fa-wm-switcher-list"
                  aria-label={group.info?.label ?? "Windows"}
                >
                  {group.windows.map((entry) => {
                    const {
                      title,
                      subtitle,
                      icon: Icon,
                    } = describeWindow(entry.kind, entry.params);
                    return (
                      <li key={entry.id} className="fa-wm-switcher-row">
                        <ListRow
                          title={title}
                          meta={subtitle}
                          icon={Icon ? <Icon /> : undefined}
                          trailing={<Badge size="sm">{stateText(entry)}</Badge>}
                          className="fa-wm-switcher-item"
                          selected={focusedId === entry.id && !entry.minimised}
                          onClick={() => choose(entry.id)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<IconClose />}
                          aria-label={`Close ${title}`}
                          onClick={() => void manager.close(entry.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </Sheet.Body>
      </Sheet.Popup>
    </Sheet.Root>
  );
}
