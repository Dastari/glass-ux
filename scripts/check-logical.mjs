import { checkLogical } from "./docs-kit/lib/check-logical.mjs";
import { loadDocsKit } from "./docs-kit/lib/config.mjs";

checkLogical(await loadDocsKit());
