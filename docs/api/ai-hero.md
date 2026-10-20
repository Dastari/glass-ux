# AiHero

The Assistant landing: the mark and one question, directly on the canvas (R4.6), on the
reading column. Inside a ConversationLog it is the `landing` (the log places the composer
and suggestions under it, so the composer survives the first message); on its own it can
hold the composer and suggestions as children. No subtitle — the composer says the rest.

`import { AiHero } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ai-hero)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The composer, then the suggestions. |
| emphasis | `string \| undefined` | See type | no | "help you" | Portion of the heading receiving emphasis. |
| title | `string \| undefined` | See type | no | "What can I help you with?" | The headline; the part in `emphasis` takes the accent gradient (one per screen). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
