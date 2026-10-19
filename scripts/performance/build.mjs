// Run after pnpm build. Normal fixtures consume dist/ as docs do. PERF_BASELINE_REF
// substitutes only the changed modules from that commit for matched before/after fixtures.
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";
await build({
  configFile: false,
  root: resolve(import.meta.dirname),
  plugins: [
    react(),
    {
      name: "perf-key-counters",
      load(id) {
        const match = id.match(
          /\/dist\/(ui\/(?:data-table\/(?:body|local-page)|tree\/tree|topology\/layout))\.js$/,
        );
        if (!process.env.PERF_BASELINE_REF || !match) return;
        const path = `src/${match[1]}.${/local-page|topology\/layout/.test(match[1]) ? "ts" : "tsx"}`;
        const source = execFileSync(
          "git",
          ["show", `${process.env.PERF_BASELINE_REF}:${path}`],
          { encoding: "utf8" },
        );
        return ts.transpileModule(source, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
          },
        }).outputText;
      },
      transform(code, id) {
        if (id.endsWith("/dist/ui/data-table/body.js"))
          return code.replace(
            /(const keyAt = (?:useCallback\()?\(index\) => \{)/,
            "$1\nwindow.__perf.keys++;",
          );
        if (id.endsWith("/dist/ui/tree/tree.js"))
          return code.replace(
            "rows[index]?.node.id",
            "(window.__perf.keys++, rows[index]?.node.id)",
          );
      },
    },
  ],
  build: {
    outDir: resolve(process.env.PERF_DIST ?? ".handoff/performance-dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(
        import.meta.dirname,
        process.env.PERF_ENTRY ?? "index.html",
      ),
    },
  },
});
