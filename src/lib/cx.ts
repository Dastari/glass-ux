import { clsx, type ClassValue } from "clsx"

/**
 * Join class names. Design-system styles live in @layer components and Tailwind
 * utilities in @layer utilities, so a utility passed through `className` always wins
 * over a component default without any merge step.
 */
export function cx(...values: ClassValue[]) {
  return clsx(values)
}
