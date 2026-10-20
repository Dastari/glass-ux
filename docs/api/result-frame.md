# ResultFrame

The frame every tool-rendered result shares: an AiCard on the breakout column with a
compact header — glyph, title, data meta (source · count) — and the same three actions
in the same order: copy, export CSV, open in window.

`import { ResultFrame } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-frame)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| copyText | `string \| undefined` | See type | no | — | Text for the copy action; omit to hide it. |
| csv | `string \| undefined` | See type | no | — | CSV for export; omit to hide it. |
| flush | `boolean \| undefined` | false, true | no | false | Remove the body inset (tables, images). |
| footer | `ReactNode` | See type | no | — | Content after the body, normally supporting actions. |
| icon | `ReactNode` | See type | yes | — | An icon element without an explicit size; the component sizes it through its tokens. |
| meta | `string \| undefined` | See type | no | — | Data line after the source: "8 of 1,284", "3 images". |
| result | `AiResult` | See type | yes | — | Typed result, including disclosure and rendering metadata. |
