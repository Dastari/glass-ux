# GenericResult

A tool's browser preview (AiToolCallResultPreview) rendered schema-first: the disclosure
picks table, detail, value or redaction, and recognised Glass UX types upgrade to entity
cards and lists (resolvePreview).

`import { GenericResult } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/generic-result)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| preview | `ToolPreview` | See type | yes | — | The tool's raw preview: its JSON `value` (or `null` when withheld), disclosure hints and preview cap, resolved to a result with the entity resolver. |
