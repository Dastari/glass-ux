import { checkPure } from "./docs-kit/lib/check-pure.mjs";
import { loadDocsKit } from "./docs-kit/lib/config.mjs";

checkPure(await loadDocsKit(), process.argv.slice(2));
