import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { forbiddenPattern, loadDocsKit, resolveDocsKit } from "./docs-kit/lib/config.mjs";
import {
  documentedEntries,
  entrySpecifiers,
  exportMap,
  publicSpecifier,
  resolvesInPackage,
} from "./docs-kit/lib/entries.mjs";
import { propOrigin } from "./docs-kit/lib/api-options.mjs";
import { initDocsKit } from "./docs-kit/lib/init.mjs";
import { llmsText, writeSiteModule } from "./docs-kit/lib/site-module.mjs";

const scratch = mkdtempSync(join(tmpdir(), "docs-kit-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

const manifest = (name, fields) => ({ name, version: "1.2.3", ...fields });

/** Runs `fn` with the working directory in a new scratch project holding `files`. */
function inProject(name, files, fn) {
  const root = join(scratch, name);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const cwd = process.cwd();
  process.chdir(root);
  try {
    return fn(root);
  } finally {
    process.chdir(cwd);
  }
}

const exports = (...keys) =>
  Object.fromEntries(
    keys.map((key) => [key, { types: `./dist/${key.slice(2)}/index.d.ts`, import: `./dist/${key.slice(2)}/index.js` }]),
  );

test("defaults come from package.json", () => {
  const kit = resolveDocsKit(
    {},
    manifest("demo", {
      homepage: "https://example.test/demo",
      repository: { url: "git+https://example.test/org/demo.git" },
    }),
  );
  assert.equal(kit.title, "demo");
  assert.equal(kit.siteUrl, "https://example.test/demo/");
  assert.equal(kit.repository, "https://example.test/org/demo");
  assert.equal(kit.galleryDir, "src/gallery");
  assert.deepEqual(kit.checks.logicalDirs, ["src"]);
  assert.deepEqual(kit.checks.presentationDirs, ["src/gallery", "apps/docs/src"]);
});

test("a project without a homepage omits its live-example links", () => {
  assert.equal(resolveDocsKit({}, manifest("demo", {})).siteUrl, undefined);
});

test("entries are the JavaScript exports, sorted, without exclusions", () => {
  const pkg = manifest("demo", {
    exports: {
      ...exports("./zebra", "./alpha", "./hidden"),
      "./styles.css": "./dist/styles.css",
      "./package.json": "./package.json",
    },
  });
  inProject("sorted", { "src/zebra/index.ts": "", "src/alpha/index.ts": "", "src/hidden/index.ts": "" }, () => {
    const kit = resolveDocsKit({ entries: { exclude: ["./hidden"] } }, pkg);
    assert.deepEqual(
      documentedEntries(kit).map((entry) => [entry.entry, entry.family, entry.file]),
      [
        ["demo/alpha", "alpha", "src/alpha/index.ts"],
        ["demo/zebra", "zebra", "src/zebra/index.ts"],
      ],
    );
  });
});

test("wildcards expand only as configured, and last keeps its order", () => {
  const pkg = manifest("demo", {
    exports: {
      "./panels/*": { import: "./dist/panels/*/index.js" },
      "./icons/*": { import: "./dist/icons/*.js" },
      "./tail": { import: "./dist/tail.js" },
      "./head": { import: "./dist/head.js" },
    },
  });
  inProject(
    "wild",
    { "src/panels/layers/index.ts": "", "src/panels/adjust/index.ts": "", "src/tail.ts": "", "src/head.tsx": "" },
    () => {
      const kit = resolveDocsKit(
        { entries: { expand: { "./panels/*": ["layers", "adjust", "absent"] }, last: ["./head", "./panels/adjust"] } },
        pkg,
      );
      assert.deepEqual(
        documentedEntries(kit).map((entry) => entry.key),
        ["./panels/layers", "./tail", "./head", "./panels/adjust"],
      );
    },
  );
});

test("the root entry has no family and a lone target is the root entry", () => {
  const pkg = manifest("demo", { exports: "./dist/index.js" });
  assert.deepEqual(Object.keys(exportMap(pkg)), ["."]);
  inProject("root", { "src/index.ts": "" }, () => {
    assert.equal(documentedEntries(resolveDocsKit({}, pkg))[0].family, null);
  });
});

test("specifiers follow the package's own name", () => {
  const pkg = manifest("tide-ui", { exports: exports("./gauge") });
  const entries = entrySpecifiers(pkg);
  assert.equal(publicSpecifier("gauge/index", entries, "tide-ui"), "tide-ui/gauge");
  assert.equal(publicSpecifier("gauge/internal", entries, "tide-ui"), null);
  assert.equal(resolvesInPackage("tide-ui/gauge", pkg), true);
  assert.equal(resolvesInPackage("tide-ui/absent", pkg), false);
  // Another package's specifier is not this package's to judge.
  assert.equal(resolvesInPackage("tide-ui-extras/absent", pkg), true);
});

test("prop origin follows the configured source folder", () => {
  assert.equal(propOrigin("/repo/lib/gauge.tsx", "lib"), "own");
  assert.equal(propOrigin("/repo/lib/gauge.tsx"), "package");
  assert.equal(propOrigin("/repo/node_modules/x/lib/y.d.ts", "lib"), "package");
});

test("forbidden terms: strings are literal, patterns are kept", () => {
  assert.ok(forbiddenPattern("a.b").test("A.B"));
  assert.ok(!forbiddenPattern("a.b").test("axb"));
  assert.ok(forbiddenPattern(/x\d/).test("x1"));
});

test("Glass UX's entries keep their documented order and names", async () => {
  const kit = await loadDocsKit();
  const entries = documentedEntries(kit);
  const ui = readdirSync("src/ui").filter((dir) => existsSync(`src/ui/${dir}/index.ts`));
  assert.deepEqual(
    entries.map((entry) => entry.entry),
    [...ui, "ai", "shell", "windows", "appearance", "locale", "icons"].map((name) => `glass-ux/${name}`),
  );
  assert.equal(entries.at(-1).file, "src/icons/generated/icons.tsx");
});

test("the scripts name no glass-ux table or path of their own", () => {
  const lib = "scripts/docs-kit/lib";
  for (const file of readdirSync(lib).filter((name) => name.endsWith(".mjs"))) {
    const text = readFileSync(join(lib, file), "utf8");
    assert.doesNotMatch(text, /sectionByFamily|familyRoots|["'`]src\/ui|apps\/docs\/dist"\)/, file);
  }
});

test("llms.txt needs only an intro", () => {
  assert.equal(llmsText({ title: "Sample", llms: { intro: "About it." } }), "# Sample\n\nAbout it.\n\n");
  assert.equal(
    llmsText({ title: "Sample", llms: { intro: "About it.", links: [{ title: "Guide", path: "docs/guide.md" }] } }),
    "# Sample\n\nAbout it.\n\n- [Guide](docs/guide.md)\n",
  );
});

test("a project with no guides still gets typed guides", () => {
  const root = mkdtempSync(join(tmpdir(), "docs-kit-site-"));
  try {
    writeSiteModule(
      { galleryDir: root, title: "Sample", name: "sample", version: "1.2.3", guides: [], badges: {}, families: [], familyMembers: {}, docsDir: "docs" },
      [],
    );
    assert.match(readFileSync(join(root, "site.generated.ts"), "utf8"), /guides: \[\] as \{ id: string; title: string \}\[\],/);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test("init copies the frame once and keeps what exists", () => {
  inProject(
    "init",
    {
      "package.json": JSON.stringify(manifest("tide-ui", { scripts: { build: "tsc", "docs:api": "custom" } })),
      ".gitignore": "node_modules/\n",
    },
    (root) => {
      initDocsKit(root);
      const pkg = JSON.parse(readFileSync("package.json", "utf8"));
      assert.equal(pkg.scripts["docs:api"], "custom");
      assert.match(pkg.scripts["docs:build"], /^glass-ux-docs api && pnpm build && vite build apps\/docs/);
      assert.ok(pkg.devDependencies.vite);
      assert.match(readFileSync("apps/docs/index.html", "utf8"), /<title>tide-ui<\/title>/);
      assert.ok(existsSync("docs-kit.config.mjs"));
      assert.ok(existsSync("src/gallery/sections"));
      writeFileSync("apps/docs/index.html", "mine");
      writeFileSync("docs-kit.config.mjs", "mine");
      initDocsKit(root);
      assert.equal(readFileSync("apps/docs/index.html", "utf8"), "mine");
      assert.equal(readFileSync("docs-kit.config.mjs", "utf8"), "mine");
      assert.equal(readFileSync(".gitignore", "utf8"), "node_modules/\n.docs-kit/\napps/docs/dist/\n");
    },
  );
});

test("the site's dependencies match what the docs app is built with", () => {
  const wanted = JSON.parse(readFileSync("scripts/docs-kit/templates/site-dependencies.json", "utf8"));
  const docs = JSON.parse(readFileSync("apps/docs/package.json", "utf8"));
  const root = JSON.parse(readFileSync("package.json", "utf8"));
  const known = { ...root.devDependencies, ...docs.dependencies, ...docs.devDependencies };
  for (const [name, version] of Object.entries(wanted)) assert.equal(version, known[name], name);
});

test("the frame imports only what the kit exports", () => {
  const frame = readFileSync("scripts/docs-kit/templates/docs-app/src/main.tsx", "utf8");
  const barrel = readFileSync("src/gallery/docs-kit.ts", "utf8");
  const [, names] = /import \{([^}]+)\} from "glass-ux-docs-kit\/react"/.exec(frame);
  for (const name of names.split(",").map((part) => part.replace("type ", "").trim()).filter(Boolean))
    assert.match(barrel, new RegExp(`\\b${name}\\b`), name);
  // Fictional sites keep no copy of Glass UX's showcase or brand fixtures.
  assert.doesNotMatch(frame, /showcase|configureDemoBrand|gallery\/fixtures/i);
});

test("the guide ships only in the kit's archive", () => {
  assert.match(readFileSync("scripts/pack-release.mjs", "utf8"), /path === "docs\/docs-kit\.md"/);
  assert.match(readFileSync("docs/docs-kit.md", "utf8"), /^# glass-ux-docs-kit/);
});
