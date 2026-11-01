#!/usr/bin/env node
/**
 * glass-ux-docs api                generate API pages, demos, examples and site.generated.ts
 * glass-ux-docs site               prepare the built site's static routes and TypeDoc
 * glass-ux-docs check [name ...]   docs, tokens, logical, css-perf, pure, boundaries, size
 * glass-ux-docs init               copy the site frame and config, once
 */
import { loadDocsKit } from "./config.mjs";

const CHECKS = {
  docs: async (kit) => (await import("./check-docs.mjs")).checkDocs(kit),
  tokens: async (kit) => (await import("./check-tokens.mjs")).checkTokens(kit),
  logical: async (kit) => (await import("./check-logical.mjs")).checkLogical(kit),
  "css-perf": async (kit) => (await import("./check-css-perf.mjs")).checkCssPerf(kit),
  pure: async (kit, args) => (await import("./check-pure.mjs")).checkPure(kit, args),
  boundaries: async (kit) => (await import("./check-boundaries.mjs")).checkBoundaries(kit),
  size: async (kit, args) => (await import("./check-size.mjs")).checkSize(kit, args),
};

const [command, ...args] = process.argv.slice(2);
const usage = () => {
  console.error(
    `Usage: glass-ux-docs <api|site|init|check [${Object.keys(CHECKS).join("|")}]>`,
  );
  process.exitCode = 1;
};

if (command === "init") {
  (await import("./init.mjs")).initDocsKit(process.cwd());
} else if (!["api", "site", "check"].includes(command)) {
  usage();
} else {
  const kit = await loadDocsKit();
  if (command === "api") await (await import("./api.mjs")).generateApi(kit);
  else if (command === "site") (await import("./site.mjs")).buildSite(kit);
  else {
    const name = args.find((arg) => !arg.startsWith("--"));
    if (name && !(name in CHECKS)) usage();
    else if (name) await CHECKS[name](kit, args.filter((arg) => arg !== name));
    else
      for (const name of Object.keys(CHECKS)) {
        // Budgets are opt-in: a project without any has nothing to measure.
        if (name === "size" && !kit.checks.budgets.length) continue;
        await CHECKS[name](kit, []);
      }
  }
}
