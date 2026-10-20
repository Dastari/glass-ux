# EntityHeaderSkeleton

The header's loading state: the same boxes as the loaded header (R9.3).

`import { EntityHeaderSkeleton } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-header-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| subtitle | `boolean \| undefined` | false, true | no | true | Reserve the subtitle (facts) line, matching a loaded header that has one. Defaults to `true`. |
| tabs | `boolean \| undefined` | false, true | no | false | Reserve the tab row, matching a loaded header that has tabs. Defaults to `false`. |
