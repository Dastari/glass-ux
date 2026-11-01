import { checkCssPerf } from "./docs-kit/lib/check-css-perf.mjs";
import { loadDocsKit } from "./docs-kit/lib/config.mjs";

checkCssPerf(await loadDocsKit());
