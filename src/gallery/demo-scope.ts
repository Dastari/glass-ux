import { createContext } from "react";

// Related exports sometimes share a composed specimen. Give its landmarks a
// distinct name when several focused demos live in the same article.
export const DemoScope = createContext<string | undefined>(undefined);
