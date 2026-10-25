import type { ComponentProps } from "react"
import { useDirection } from "./locale/direction.js"

/** Render a Base UI portal's existing div with its React direction context, including nested regions. */
export function DirectionPortal(props: ComponentProps<"div">) {
  const direction = useDirection()
  return <div {...props} dir={direction} />
}
