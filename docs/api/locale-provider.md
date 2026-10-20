# LocaleProvider

Sets the formatting locale for the components inside it: numbers, money, byte sizes,
dates, times, names and sorting. Nested providers override outer ones, so one region can
format differently from the rest of the application. A component's own `locale` prop
still wins. Without any provider, components follow `configureLocale()`, then the page's
`<html lang>`, then `en-US`.

`import { LocaleProvider } from "glass-ux/locale"`

[Live examples](https://dastari.github.io/glass-ux/components/locale-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The components that format with this locale. |
| locale | `string` | See type | yes | — | BCP 47 tag ("en-AU", "de-CH") for every component inside. An invalid tag is ignored, so the enclosing provider, `configureLocale()` or `<html lang>` applies instead. |
