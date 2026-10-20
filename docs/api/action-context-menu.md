# ActionContextMenu

Right-click (long-press, Shift+F10, the Menu key) on a row or card opens exactly the
menu its ⋯ button opens (R11.6) — the same definition, the same item parts.

`import { ActionContextMenu } from "glass-ux/actions"`

[Live examples](https://dastari.github.io/glass-ux/components/action-context-menu)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>>` | See type | yes | — | The row or card that owns the actions. It must forward its ref and spread props; make it focusable so Shift+F10 and the Menu key reach the menu from the keyboard. |
| label | `string` | See type | yes | — | The target's name: "Actions for NST-C106". |
| set | `ActionSet<T>` | See type | yes | — | Shared action definitions used by menus, headers and the command palette. |
| targets | `readonly T[]` | See type | yes | — | Selected entities passed to action visibility, enablement, confirmation and execution. |
