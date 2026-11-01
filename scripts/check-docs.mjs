import { checkDocs } from "./docs-kit/lib/check-docs.mjs";
import { loadDocsKit } from "./docs-kit/lib/config.mjs";

checkDocs(await loadDocsKit());
