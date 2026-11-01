# Menubar

`glass-ux/menubar` · [Live component catalogue](https://dastari.github.io/glass-ux/)

An application's menus, as data, on Base UI's Menubar primitive. It is a separate entry from
`glass-ux/menu` because the bar's collapse, data rows and loaded menus would otherwise weigh on
every dropdown. Its popups and rows are `Menu`'s, so a menubar row and a menu row are the same
object (R1.1).

```tsx
import { Menubar, type MenubarMenu } from "glass-ux/menubar"

const menus: MenubarMenu[] = [
  {
    id: "file",
    label: "File",
    items: [
      { id: "save", label: "Save", shortcut: "mod+s", onSelect: save },
      { kind: "separator", id: "print-separator" },
      { id: "print", label: "Print…", disabledReason: "Nothing is selected to print" },
    ],
  },
  {
    id: "view",
    label: "View",
    items: [{ kind: "check", id: "ruler", label: "Ruler", checked: ruler, onCheckedChange: setRuler }],
  },
]

<Menubar aria-label="Report editor" menus={menus} onCommand={(id) => run(id)} />
```

The bar draws no surface. Put it in a window, a panel header or a top row, which own the frame,
and give it a box: it fills the width it is given.

## Rows

`items` is a list of entries. `kind` chooses the row; a plain command has none. A `null`,
`undefined` or `false` entry is skipped, and a separator left with nothing on one side goes with it.

| `kind` | Row |
| --- | --- |
| none, or `"item"` | A command. `icon`, `detail`, `trail`, `tone`, `onSelect` |
| `"check"` | A toggle: `checked`, `onCheckedChange`. It stays open when pressed |
| `"radio"` | A set of choices under a label: `value`, `onValueChange`, `options` |
| `"group"` | Rows set apart by space, with an optional `label` |
| `"separator"` | A hairline. At most two in a menu (R5.8) |
| `"submenu"` | A nested menu: `items`, or `loadItems` |

Toggles and choices are controlled: a closed menu holds no state, so the host does. Commands run
after the menu closes, so focus is home before a dialog opens: the row's `onSelect`, then the bar's
`onCommand(id, entry)`. Every row can say why it is unavailable with `disabledReason` (R12.3).

## One definition with actions

`useMenubarActions` turns a `defineActions` set into rows, so the menu bar, command palette and
shortcuts read one definition (R1.2). Rows run through the action runner, confirmation included.

```tsx
const actions = useMenubarActions(documentActions, targets)
useActionShortcuts(documentActions, targets, "Documents") // this is what runs the keys

const menus = [
  { id: "file", label: "File", items: [actions.item("save"), actions.item("export")] },
  { id: "document", label: "Document", items: actions.all },
]
```

`item(id)` returns one row or submenu, or null when the action is hidden for these targets.
`all` is every visible action in the fixed group order.

## Shortcuts

`shortcut` shows keys, chords included ("mod+k mod+s"), in the platform's form. With a
`commandId` and a `KeymapProvider`, the row shows the person's rebinding. It works with no
provider too. Showing keys registers nothing: the rows use `useCommandBinding`, which is
read-only, and the bar adds no listener. To run the keys, register them with
`useActionShortcuts` or `useShortcutCommands`.

`shortcutScoped` marks keys that work only in part of the page, such as a tool key while an
editor has focus. They are display-only here, always shown even when `configureShortcuts` has
turned single keys off, and a click on the row runs the command directly.

## Items at open time

A menu or submenu can take `loadItems` instead of `items`. It runs each time the menu opens, with
an `AbortSignal` that fires if the menu closes first. It may return rows at once or a promise.

```tsx
{
  kind: "submenu",
  id: "recent",
  label: "Open recent",
  loadingRows: 5,
  loadError: "Recent files are unavailable. Try again.",
  emptyLabel: "No recent files",
  loadItems: ({ signal }) => fetchRecent(signal).then((files) => files.map(toRow)),
}
```

- **Loading**: `loadingRows` placeholders hold the space (default 4; later opens reserve what the
  last load returned). The first is a real row named "Loading", so a keyboard has somewhere to land.
- **Arrival**: rows replace the placeholders in place. The popup keeps its height and grows only as
  far as the screen allows without shifting, so nothing moves under the pointer (R9); a longer list
  scrolls. A keyboard moves to the first row.
- **Failure**: a rejected load shows `loadError`, or a default sentence, with **Try again**. It is
  announced politely. A rejection's raw message is never shown (R2.4); pass a function to word it.
- **Empty**: `emptyLabel`, or "No items".

## Long menus

A menu or submenu uses the height the screen has, and scrolls when it is taller. A hairline shows
at an edge with rows beyond it (R5.8). Keyboard movement keeps the focused row in view. Group labels
break up a long menu without using up its two separators.

## Rich rows

`icon` takes any node at a stable size. With `detail`, the row takes one fixed taller height and
`icon` a thumbnail's box. Long text truncates, so every row keeps the height of its kind.

```tsx
{ id: "survey", label: "Harbour survey", detail: "Reports · 12 March", icon: <img src={thumbnail} alt="" /> }
```

## Focus

| What closed the menu | Focus goes to |
| --- | --- |
| A command, with `focusAfterCommand` | The host's element: a ref, or a function called at that moment |
| A command, without it | The trigger, like any menu |
| Escape | The trigger, or the submenu's row one level up |
| A press outside | Wherever that press put it |

Pass `focusAfterCommand` when the bar drives a document, so a person can keep typing.

## Open state

`openMenu` holds the open menu's id, or null, and `onOpenMenuChange` reports changes. Leave it
undefined to let the bar hold it, with `defaultOpenMenu` for the first render. While collapsed, the
value is `MENUBAR_COLLAPSED_MENU`.

## Collapsing

`collapse="auto"` (the default) folds the menus into one **Menu** button when they do not fit the
box the bar is given (R7.6). It measures its own box, not the viewport, so it works in a narrow
window or panel. Each menu becomes a submenu of that one menu, and focus stays on the bar if it was
there. Popups portal out of the box and fit the screen, and portal into a full-screen element when
one is active. `collapse="never"` lets the row wrap; `collapse="always"` keeps one menu.

## Keys

The bar is one tab stop, following the WAI-ARIA menubar pattern. Left and right follow the reading
direction.

| Key | On the bar | In a menu |
| --- | --- | --- |
| ← → | Move between menus | Go to the next or previous menu, on its first row; on a submenu row, → opens it; in a submenu, ← closes it |
| ↓ Enter Space | Open, on the first row | ↓ next row; Enter and Space choose |
| ↑ | Open, on the last row | Previous row |
| Home End | First or last menu | First or last row |
| Esc | | Close this level and return focus |
| Tab | Leave the bar | Close and leave the bar |
| A letter | | Go to the next row starting with it |

Once a menu is open, hovering another trigger switches to it.

## Touch and phones

A tap opens a menu, a tap on another trigger switches, and a tap on a submenu row opens it; there
is no hover switching. Rows and triggers take `--target-min` on a coarse pointer. On a screen with
no hover, a disabled row shows its reason under the label instead of in a tooltip. A long menu
scrolls by touch. On a phone the bar usually collapses, and a submenu that cannot fit beside its
parent sits over it, inside the screen.

## Loading the bar

`MenubarSkeleton` holds the bar's place while its menus load. Pass `labels` when they are known and
each placeholder takes that trigger's exact width (R9.3).

```tsx
{menus ? <Menubar aria-label="Report editor" menus={menus} /> : <MenubarSkeleton labels={["File", "Edit", "View"]} />}
```

## Limits

Toggles and choices have no uncontrolled form. `collapse` is all or nothing: menus do not fold one
at a time. In collapsed form `openMenu` opens the one menu at its top level, not a particular
submenu. Base UI 1.9 has no public way to choose the first focused row, so the bar passes its
popup's undocumented `initialFocus`; `e2e/menubar.spec.ts` guards it against an upgrade.
