#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { checkThemeVariables } from "./check-layout.mjs";

const source = fileURLToPath(new URL("../skills/", import.meta.url));
const names = readdirSync(source).filter((name) =>
  existsSync(join(source, name, "SKILL.md")),
);
const [command, action, ...args] = process.argv.slice(2);
if (command === "check-layout") {
  try {
    console.log(
      `layout: CSS variables resolve in ${checkThemeVariables([action, ...args].filter(Boolean))} stylesheets`,
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  process.exit(0);
}
if (command !== "skills" || !["list", "install"].includes(action)) {
  console.log(
    "glass-ux skills list\nglass-ux skills install --target agents|codex|claude [--update]\nglass-ux check-layout <stylesheet files or directories>",
  );
  process.exit(command ? 1 : 0);
}
if (action === "list") {
  for (const name of names) {
    const text = readFileSync(join(source, name, "SKILL.md"), "utf8");
    console.log(`${name}: ${/^description:\s*(.+)$/m.exec(text)?.[1] ?? ""}`);
  }
  process.exit(0);
}
const index = args.indexOf("--target"),
  target = index >= 0 ? args[index + 1] : "agents";
if (!["agents", "codex", "claude"].includes(target))
  throw new Error("Choose --target agents, codex or claude");
const destination = resolve(
  process.cwd(),
  target === "claude" ? ".claude/skills" : ".agents/skills",
);
const update = args.includes("--update");
const conflicts = names.filter((name) => existsSync(join(destination, name)));
if (conflicts.length && !update)
  throw new Error(
    `Skills already exist: ${conflicts.join(", ")}. Use --update to replace these Glass UX skills.`,
  );
mkdirSync(destination, { recursive: true });
for (const name of names)
  cpSync(join(source, name), join(destination, name), { recursive: true });
console.log(
  `Installed ${names.length} Glass UX skills into ${destination}. Existing project instructions were not changed.`,
);
