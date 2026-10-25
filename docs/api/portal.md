# Portal

Render outside the current DOM hierarchy, preserving React context. Server and hydration renders are empty.

`import { Portal } from "glass-ux/portal"`

[Live examples](https://dastari.github.io/glass-ux/components/portal)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | Content rendered after hydration. |
| container | `Element \| DocumentFragment \| RefObject<Element \| DocumentFragment \| null> \| null \| undefined` | See type | no | — | Destination element or ref. Omit for document.body; null waits for a destination. |
