import { Fragment, type ReactNode } from "react"

/** Internal rich placeholders: translators own ordering; React owns the supplied elements. */
export function messageContent(text: string, parts: Readonly<Record<string, ReactNode>>): ReactNode {
  return text.split(/(\{[A-Za-z]+\})/).map((part, index) => (
    <Fragment key={index}>{Object.hasOwn(parts, part.slice(1, -1)) && /^\{[A-Za-z]+\}$/.test(part) ? parts[part.slice(1, -1)] : part}</Fragment>
  ))
}
