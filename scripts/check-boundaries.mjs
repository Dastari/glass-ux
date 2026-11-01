import { checkBoundaries } from "./docs-kit/lib/check-boundaries.mjs";
import { loadDocsKit } from "./docs-kit/lib/config.mjs";

checkBoundaries(await loadDocsKit());
