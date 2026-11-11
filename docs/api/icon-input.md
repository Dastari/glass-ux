# IconInput

A field that holds an icon's name: a box showing the chosen icon that opens an IconPicker in a
popover. Use it to let people give a category, asset type or list its own icon; store the name
and draw it with `iconCatalogue` (or a map of your own icons) where the item is shown.

`import { IconInput } from "glass-ux/icon-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/icon-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `import("@base-ui/react/internals/useAnchorPositioning").Align \| undefined` | "center", "start", "end" | no | "start" | Alignment of the overlay relative to its anchor. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| clearable | `boolean \| undefined` | false, true | no | false | Offer No icon in the picker, which clears the value. Default false. |
| defaultValue | `string \| null \| undefined` | See type | no | null | The chosen icon when uncontrolled. Default none. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| icons | `readonly IconCatalogueEntry[] \| undefined` | See type | no | iconCatalogue | The icons to offer. Default every icon (`iconCatalogue`). |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| name | `string \| undefined` | See type | no | — | Submits the chosen name with a native form. |
| onBlur | `((event: FocusEvent<HTMLButtonElement>) => void) \| undefined` | See type | no | — | Called when focus leaves the trigger, so a form can mark the field touched. |
| onValueChange | `((name: string \| null) => void) \| undefined` | See type | no | — | Called with the chosen name, or null when the person clears it. |
| placeholder | `string \| undefined` | See type | no | — | Shown while no icon is chosen. Default "Choose an icon". |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| side | `import("@base-ui/react/internals/useAnchorPositioning").Side \| undefined` | "top", "bottom", "left", "right", "inline-end", "inline-start" | no | — | Preferred side of the anchor; collision handling may choose another side. |
| value | `string \| null \| undefined` | See type | no | — | The chosen icon's name, controlled; null for none. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "medium" | Content width: short, medium (default) or full. |
