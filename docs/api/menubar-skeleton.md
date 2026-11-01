# MenubarSkeleton

A placeholder bar with the same height and rhythm as the loaded bar.

`import { MenubarSkeleton } from "glass-ux/menubar"`

[Live examples](https://dastari.github.io/glass-ux/components/menubar-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Layout only. |
| count | `number \| undefined` | See type | no | 5 | How many menus to stand in for when the labels are not known. Default 5. |
| labels | `readonly string[] \| undefined` | See type | no | — | The menus' labels, when they are known: each placeholder then takes that trigger's exact width. |
| size | `MenubarSize \| undefined` | "sm", "md" | no | "sm" | The size the bar will take. |
