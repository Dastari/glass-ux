# TopologyCanvasSkeleton

The whole canvas while there is nothing to give it yet (no label, no nodes): the same box and loading shape.

`import { TopologyCanvasSkeleton } from "glass-ux/topology"`

[Live examples](https://dastari.github.io/glass-ux/components/topology-canvas-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| insets | `TopologyInsets \| null \| undefined` | See type | no | — | Page chrome over the canvas in CSS pixels, matching the TopologyCanvas's `insets`; `null` marks them as still being measured. |
