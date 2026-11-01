import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { CONFIG_FILE } from "./config.mjs";

const TEMPLATES = join(import.meta.dirname, "../templates");
const SITE = "apps/docs";
const IGNORED = [".docs-kit/", `${SITE}/dist/`];

/**
 * Copies the site frame into `apps/docs`, once, and adds what the site needs to the project:
 * a config, package scripts, development dependencies and ignore rules. Nothing that already
 * exists is overwritten, so later kit releases leave a project's frame alone.
 */
export function initDocsKit(root) {
  const manifestPath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));
  const site = join(root, SITE);
  if (existsSync(site)) console.log(`init: ${SITE} exists, left as it is`);
  else {
    cpSync(join(TEMPLATES, "docs-app"), site, { recursive: true });
    const page = join(site, "index.html");
    writeFileSync(
      page,
      readFileSync(page, "utf8").replace("__TITLE__", pkg.name),
    );
    console.log(`init: copied the site frame to ${SITE}`);
  }
  const config = join(root, CONFIG_FILE);
  if (!existsSync(config)) {
    writeFileSync(
      config,
      `import { defineDocsKit } from "glass-ux-docs-kit/config";

// The package name, version, entries, homepage and repository come from package.json.
export default defineDocsKit({
  title: ${JSON.stringify(pkg.name)},
  entries: { exclude: ["./package.json"] },
  guides: [],
});
`,
    );
    console.log(`init: wrote ${CONFIG_FILE}`);
  }
  mkdirSync(join(root, "src/gallery/sections"), { recursive: true });
  const build = pkg.scripts?.build ? "pnpm build && " : "";
  pkg.scripts = {
    "docs:api": "glass-ux-docs api",
    "docs:dev": `vite ${SITE}`,
    "docs:build": `glass-ux-docs api && ${build}vite build ${SITE} && glass-ux-docs site`,
    "docs:check": "glass-ux-docs check docs",
    ...pkg.scripts,
  };
  const wanted = JSON.parse(
    readFileSync(join(TEMPLATES, "site-dependencies.json"), "utf8"),
  );
  const present = { ...pkg.dependencies, ...pkg.peerDependencies };
  const added = Object.entries(wanted).filter(
    ([name]) => !present[name] && !pkg.devDependencies?.[name],
  );
  pkg.devDependencies = {
    ...pkg.devDependencies,
    ...Object.fromEntries(added),
  };
  writeFileSync(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`);
  const ignorePath = join(root, ".gitignore");
  const ignored = existsSync(ignorePath) ? readFileSync(ignorePath, "utf8") : "";
  const missing = IGNORED.filter((line) => !ignored.split("\n").includes(line));
  if (missing.length) appendFileSync(ignorePath, `${missing.join("\n")}\n`);
  console.log(
    `init: added ${added.length} development dependencies. Run your package manager's install, write src/gallery/sections/<id>.meta.ts and <id>.section.tsx, then docs:build.`,
  );
}
