# Image

A picture in a frame of fixed ratio, with the media corner radius and a hairline rim. The
frame is reserved before the picture loads, a shimmer or the picture's colour fills it
meanwhile, and the picture fades in. A missing source or a failed load shows a fallback in
the icon language, with the alt text when the frame is wide enough. No shadow: an image
sits on its surface (R4.5).

`import { Image } from "glass-ux/image"`

[Live examples](https://dastari.github.io/glass-ux/components/image)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| alt | `string` | See type | yes | — | Text alternative. Required: pass `""` for a decorative image. Shown in the fallback when the frame is wide enough. |
| className | `string \| undefined` | See type | no | — | Classes for the frame, for layout. |
| color | `string \| undefined` | See type | no | — | The picture's dominant colour: shown while it loads instead of the shimmer, and around a contained picture. |
| fallback | `ReactNode` | See type | no | — | Replaces the designed fallback shown for a missing or failed image. |
| fit | `"contain" \| "cover" \| undefined` | "contain", "cover" | no | "cover" | `cover` fills and crops (default); `contain` shows the whole picture inside the frame. |
| frame | `boolean \| undefined` | false, true | no | true | A hairline rim around the frame, which keeps a pale picture's edge visible on a pale surface. Default true. |
| hover | `"none" \| "zoom" \| "sheen" \| undefined` | "none", "zoom", "sheen" | no | "none" | Feedback when the image is inside a link or button and that is hovered or focused: `zoom` scales the picture inside its frame, `sheen` sweeps a glass highlight across it. Static images never react. Still and reduced motion turn both off. Default `none`. |
| maxHeight | `import("csstype").Property.MaxHeight<string \| number> \| undefined` | See type | no | — | The tallest the frame may be; it narrows to keep its ratio. |
| onStateChange | `((state: ImageState) => void) \| undefined` | See type | no | — | Called when the state changes, for example to hide a caption when the image fails. |
| position | `import("csstype").Property.ObjectPosition<string \| number> \| undefined` | See type | no | — | `object-position`: the point kept in view when `cover` crops, such as `"50% 25%"`. |
| radius | `AspectRatioRadius \| undefined` | "dialog", "none", "control", "tile", "surface", "overlay", "media" | no | "media" | Corner role. Default `media`. |
| ratio | `ImageRatio \| undefined` | See type | no | "landscape" | The frame's shape, reserved before the image loads so nothing moves. Default `landscape` (4:3). |
| src | `string \| null \| undefined` | See type | no | — | Image URL. Empty or missing shows the empty fallback. |
| style | `CSSProperties \| undefined` | See type | no | — | Inline style for the frame. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLImageElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
