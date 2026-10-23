# FileIcon

The file-type icon for a file name, MIME type or known kind. Detection follows `fileKind`;
the chosen kind is on `data-file-kind` so an application can colour kinds from its own CSS.
Decorative by default like every icon: pass `label` when no visible text names the file.

`import { FileIcon } from "glass-ux/file-icon"`

[Live examples](https://dastari.github.io/glass-ux/components/file-icon)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| kind | `FileKind \| undefined` | "audio", "code", "data", "link", "script", "video", "image", "text", "key", "document", "presentation", "email", "file", "folder", "pdf", "spreadsheet", "ebook", "vector", "font", "model", "database", "archive", "executable", "disk-image", "calendar", "contact", "encrypted" | no | — | The kind, when the application already knows it. Skips detection. |
| label | `string \| undefined` | See type | no | — | Accessible name. Omit for decorative icons (the default) — they are hidden from AT. |
| mime | `string \| null \| undefined` | See type | no | — | MIME type. A specific type (`application/pdf`) wins over the extension. |
| name | `string \| null \| undefined` | See type | no | — | File name or path. Its extension picks the icon when the MIME type is missing or generic. |
| size | `IconSize \| undefined` | "xs", "sm", "md", "lg", "xl", "2xl" | no | — | Token size. Omit only when a parent component sizes its icons. |
| tint | `boolean \| undefined` | false, true | no | — | Set false to drop the duotone tint for this instance. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

Also accepts the element’s standard HTML attributes and React DOM events.
