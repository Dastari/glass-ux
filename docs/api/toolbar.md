# Toolbar

A toolbar: `Root`, `Button` (with toggles), `Group`, `Item` (any control), `Separator`
and `Spacer`, plus Base UI's `Input` and `Link` for text fields and links in the row.

`import { Toolbar } from "glass-ux/toolbar"`

[Live examples](https://dastari.github.io/glass-ux/components/toolbar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Names the toolbar for assistive technology ("Formatting"). Required: toolbars are landmarks of controls. |
| children | `ReactNode` | See type | yes | — | Toolbar.Button, Toolbar.Group, Toolbar.Item, Toolbar.Separator and Toolbar.Spacer. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| labels | `Partial<{ readonly more: "More"; }> \| undefined` | See type | no | — |  |
| overflow | `boolean \| undefined` | false, true | no | true | Fold items into a trailing More menu when they do not fit, by `priority` (default true). Off, the toolbar never folds; give it room or let it scroll. |
| size | `ToolbarSize \| undefined` | "sm", "md" | no | "sm" | sm (default) for panel headers and editors, md beside fields. |
