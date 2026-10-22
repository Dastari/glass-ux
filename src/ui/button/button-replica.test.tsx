// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import type { ReactNode } from "react"
import { Button, ButtonReplica, type ButtonProps } from "./button.js"
import { IconCheck, IconChevronDown } from "../../icons/generated/icons.js"

afterEach(cleanup)

/** The button element's markup without behaviour-only attributes (ids, focus, ARIA, Base UI markers). */
function markup(node: ReactNode) {
  const { container } = render(<div>{node}</div>)
  const button = container.querySelector("button")!
  for (const element of [button, ...button.querySelectorAll("*")]) {
    const kept = element
      .getAttributeNames()
      .filter(
        (name) =>
          !(
            name === "id" ||
            name === "tabindex" ||
            name === "type" ||
            name.startsWith("aria-") ||
            name.startsWith("data-base-ui")
          ),
      )
      .toSorted()
      .map((name) => [name, element.getAttribute(name)!] as const)
    for (const name of element.getAttributeNames()) element.removeAttribute(name)
    for (const [name, value] of kept) element.setAttribute(name, value)
  }
  return button.outerHTML
}

const CASES: {
  name: string
  props: ButtonProps & { tracksStatus?: boolean }
}[] = [
  { name: "label", props: { children: "Save" } },
  {
    name: "icon and label",
    props: { icon: <IconCheck />, children: "Save", variant: "primary" },
  },
  {
    name: "icon only",
    props: {
      icon: <IconCheck />,
      "aria-label": "Save",
      variant: "ghost",
      size: "sm",
    },
  },
  {
    name: "trailing icon",
    props: {
      iconEnd: <IconChevronDown />,
      children: "More actions",
      variant: "ghost",
    },
  },
  {
    name: "status, no icon",
    props: { children: "Restart", tracksStatus: true },
  },
  {
    name: "status with icon",
    props: {
      icon: <IconCheck />,
      children: "Restart",
      variant: "danger-soft",
      tracksStatus: true,
    },
  },
]

describe("ButtonReplica", () => {
  for (const { name, props } of CASES)
    it(`renders Button's markup at rest: ${name}`, () => {
      const { tracksStatus, ...buttonProps } = props
      const replica = {
        variant: props.variant,
        size: props.size,
        icon: props.icon,
        iconEnd: props.iconEnd,
        tracksStatus,
        children: props.children,
      }
      expect(markup(<ButtonReplica {...replica} />)).toBe(
        markup(<Button {...buttonProps} status={tracksStatus ? "idle" : undefined} />),
      )
    })

  it("marks a disabled action as Button does", () => {
    expect(markup(<ButtonReplica disabled>Archive</ButtonReplica>)).toBe(
      markup(<Button disabledReason="Sample reason">Archive</Button>),
    )
  })
})
