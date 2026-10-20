# AskMarker

A pending ask's place in the transcript while the ask dock holds it: one line, the same
box as the record it becomes, and Review, which brings the ask to the front of the dock
and moves focus to it. Never a second interactive copy.

`import { AskMarker } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ask-marker)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `AiAsk` | See type | yes | — | The pending ask the dock holds; supplies the waiting label, the question and the id Review brings to the front. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
