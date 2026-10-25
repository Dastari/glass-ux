# Pagination

The pager that sits in a table's status bar. "1–25 of 1,284", the page size, first /
previous / page jump / next / last. It adapts to its own width (container queries): the
page size, then the jump field, then the first/last buttons fold away.

`import { Pagination } from "glass-ux/pagination"`

[Live examples](https://dastari.github.io/glass-ux/components/pagination)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| compact | `boolean \| undefined` | false, true | no | false | One line: the range and previous/next only (short containers, card lists). |
| cursor | `PaginationCursor \| undefined` | See type | no | — | Cursor mode: next/previous only, no last page or page jump. |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| label | `string \| undefined` | See type | no | — | Names the navigation landmark, e.g. "Endpoint pages". |
| loading | `boolean \| undefined` | false, true | no | false | First load: the range is a placeholder and the buttons wait. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for the range and page numbers. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| onPageChange | `((pageIndex: number) => void) \| undefined` | See type | no | — | Called with the zero-based index of the page the person asks for (first, previous, next, last or page jump); not used in cursor mode. Pair with `pageIndex` to control it. |
| onPageSizeChange | `((pageSize: number) => void) \| undefined` | See type | no | — | Called with the rows-per-page the person picks from `pageSizes`. The page-size menu shows only when this is set, there are two or more choices and the pager is not compact. Pair with `pageSize`. |
| pageIndex | `number` | See type | yes | — | Zero-based page index. |
| pageRows | `number` | See type | yes | — | Rows on the current page (the last page may be short). |
| pageSize | `number` | See type | yes | — | Number of records per page. |
| pageSizes | `readonly number[] \| undefined` | See type | no | [25, 50, 100] | Page-size choices offered by pagination. |
| rowCount | `number \| undefined` | See type | no | — | Total rows on the server; omit when unknown (cursor pages). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
