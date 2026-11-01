import { site } from "./site.generated.js";

/**
 * The human guides shipped with the release, in navigation order; each `id` is a guide
 * `LibraryGuide` can load and `title` is its navigation label. Metadata only, so navigation
 * can name them without loading the guide renderer (guide.tsx).
 */
export const libraryGuides = site.guides;
