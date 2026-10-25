import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
execFileSync("pnpm", ["pack:release"], { cwd: root, stdio: "inherit" });
execFileSync("node", ["--test", "scripts/client-boundaries.test.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, GLASS_UX_SKIP_TEST_BUILD: "1" },
});
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const archive = join(root, ".handoff", `${pkg.name}-${pkg.version}.tgz`);
const hash = createHash("sha256")
  .update(readFileSync(archive))
  .digest("hex")
  .slice(0, 12);
const fixture = join(root, ".handoff", "next-app-router", hash);
mkdirSync(fixture, { recursive: true });
cpSync(join(root, "tests/next-app-router"), fixture, { recursive: true });
const manifest = JSON.parse(
  readFileSync(join(fixture, "package.json"), "utf8"),
);
manifest.dependencies["glass-ux"] = `file:${archive}`;
writeFileSync(join(fixture, "package.json"), JSON.stringify(manifest, null, 2));
execFileSync(
  "pnpm",
  ["install", "--ignore-workspace", "--config.auto-install-peers=false"],
  { cwd: fixture, stdio: "inherit" },
);
execFileSync("pnpm", ["exec", "next", "build", "--webpack"], {
  cwd: fixture,
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
console.log(
  `test:next: Next.js App Router production build passed using packed ${pkg.name}@${pkg.version}`,
);
