import { createContext } from "react";

// Related exports sometimes share a composed specimen. Give its landmarks a
// distinct name when several focused demos live in the same article.
export const DemoScope = createContext<string | undefined>(undefined);

// A family document shows each related export's focused demo after the base component's.
// Specimens an earlier demo on the page already showed are listed here and render nothing,
// so a shared specimen appears once. Keys come from the demo generator (specimenKey).
export const HiddenSpecimens = createContext<ReadonlySet<string>>(new Set());

/** The element id of a generated specimen, so a later section can link to it. */
export const specimenAnchor = (key: string) => `specimen-${key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
