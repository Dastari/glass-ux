# ResultJson

The last resort: the preview as a JSON tree.

`import { ResultJson } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-json)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "json"; value: unknown; truncated?: boolean; }` | See type | yes | — | The JSON result: any JSON `value`, shown as a tree labelled by the title; `truncated` adds a note that the server cut it short. |
