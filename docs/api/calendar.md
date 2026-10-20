# Calendar

A month grid for picking a day or a range. Arrow keys move by day and week, Home and
End go to the week's ends, Page Up and Page Down change month (with Shift, year), and
Enter or Space picks. In range mode the first pick sets the start and the second the
end; the days between show as a band while you choose. Names and the first day of the
week come from the locale.

`import { Calendar } from "glass-ux/date-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/calendar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| autoFocus | `boolean \| undefined` | false, true | no | — | Focus the active day on mount (popovers). |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultMonth | `string \| undefined` | See type | no | — | Any day in the month to show first (default: the value, else today). |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for names and the first day of the week. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| max | `string \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| min | `string \| undefined` | See type | no | — | Earliest and latest selectable days. |
| mode | `"single" \| "range" \| undefined` | "single", "range" | no | — | Active display or interaction mode. |
| onValueChange | `((value: IsoDate) => void) \| ((value: DateRange) => void) \| undefined` | See type | no | — | Called with the ISO date when an enabled day is chosen by click or keyboard. Called with the ordered range once the second day is chosen; choosing the first day only anchors it. |
| today | `string \| undefined` | See type | no | todayIso() | The day marked as today (default: the user's local day). |
| value | `string \| DateRange \| null \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
