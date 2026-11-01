import { checkTokens } from "./docs-kit/lib/check-tokens.mjs";
import { loadDocsKit } from "./docs-kit/lib/config.mjs";

checkTokens(await loadDocsKit());
