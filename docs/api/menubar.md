# Menubar

An application's menu bar, as data: commands, toggles, choices, groups and submenus, with the
WAI-ARIA menubar keyboard pattern from Base UI. Left and right arrows follow the reading
direction, and once a menu is open, hovering another trigger switches to it.

Rows show keys and never listen for them, so the same definition can go to the palette and
the keymap (R1.2): build rows from an action set with `useMenubarActions`. A menu or submenu
can load its rows when it opens, with the space reserved. It folds into one menu when the box
it is given is too narrow (R7.6), and a menu taller than the space scrolls.

The bar draws no surface: place it in a window's header or a panel, which owns the frame.

`import { Menubar } from "glass-ux/menubar"`

[Live examples](https://dastari.github.io/glass-ux/components/menubar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Names the bar for assistive technology ("Application"). |
| className | `string \| undefined` | See type | no | — | Layout only. |
| collapse | `"auto" \| "never" \| "always" \| undefined` | "auto", "never", "always" | no | "auto" | `auto` (default) folds the menus into one when they do not fit the box the bar is given, whatever the viewport. `never` keeps the row; `always` keeps one menu. |
| defaultOpenMenu | `string \| null \| undefined` | See type | no | null | The menu open at first when uncontrolled. Default none. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables every menu. |
| focusAfterCommand | `MenubarFocusTarget \| undefined` | See type | no | — | Where focus goes after a command runs, such as the document the menu acts on. Escape still returns to the trigger, and an outside press leaves focus where it landed. Without it, a command returns focus to the trigger like any menu. |
| labels | `Partial<{ menu: string; loading: string; loadFailed: string; retry: string; empty: string; }> \| undefined` | See type | no | — | Wording overrides. |
| menus | `readonly MenubarMenu[]` | See type | yes | — | The menus, as data. |
| onCommand | `((id: string, entry: MenubarCommandEntry) => void) \| undefined` | See type | no | — | Called with a command row's id and row after the menu closes, after the row's own `onSelect`. |
| onOpenMenuChange | `((menu: string \| null) => void) \| undefined` | See type | no | — | Called with the menu that opened, or null when the bar closed. |
| openMenu | `string \| null \| undefined` | See type | no | — | The open menu's id, or null. Controlled while defined. While collapsed the value is `MENUBAR_COLLAPSED_MENU`. |
| size | `MenubarSize \| undefined` | "sm", "md" | no | "sm" | sm (default) for window and panel chrome, md for a page's top row. |
