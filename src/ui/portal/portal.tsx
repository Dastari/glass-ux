import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Props for an SSR-safe portal. */
export interface PortalProps {
  /** Content rendered after hydration. */
  children?: ReactNode;
  /** Destination element or ref. Omit for document.body; null waits for a destination. */
  container?:
    | Element
    | DocumentFragment
    | RefObject<Element | DocumentFragment | null>
    | null;
}

/** Render outside the current DOM hierarchy, preserving React context. Server and hydration renders are empty. */
export function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  const target =
    container === undefined
      ? document.body
      : container && "current" in container
        ? container.current
        : container;
  return target ? createPortal(children, target) : null;
}
