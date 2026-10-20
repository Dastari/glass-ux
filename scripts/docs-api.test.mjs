import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import {
  listsProp,
  literalOptions,
  packageTypePaths,
  propOrigin,
} from "./docs-api-options.mjs";

const filename = resolve("scripts/.docs-api-options-fixture.ts");
const input = `
import type { ReactNode } from "react";
type Content = ReactNode;
type OpenString = "auto" | (string & {});
type OpenNumber = number | "auto";
type ObjectOrFalse = { id: string } | false;
type CallbackOrTrue = (() => void) | true;
type Pattern = \`prefix-\${string}\` | "auto";
type NullableBroad = string | null | true;
type OptionalEnum = "sm" | "lg" | undefined;
type BooleanOnly = boolean;
type OptionalBoolean = boolean | undefined;
type Numbers = 0 | 1 | 2;
type ClosedNullable = "yes" | null | undefined;
type MixedLiterals = "auto" | 0 | false | null;
type NullOnly = null;
type UndefinedOnly = undefined;
type Unknown = unknown;
type Any = any;
`;
const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
};
const host = ts.createCompilerHost(compilerOptions);
const originalSource = host.getSourceFile.bind(host);
host.getSourceFile = (path, languageVersion, ...rest) =>
  path === filename
    ? ts.createSourceFile(path, input, languageVersion, true)
    : originalSource(path, languageVersion, ...rest);
const program = ts.createProgram([filename], compilerOptions, host);
assert.deepEqual(program.getSyntacticDiagnostics(), []);
assert.deepEqual(program.getSemanticDiagnostics(), []);
const checker = program.getTypeChecker();
const types = new Map(
  program
    .getSourceFile(filename)
    .statements.filter(ts.isTypeAliasDeclaration)
    .map((declaration) => [
      declaration.name.text,
      checker.getTypeAtLocation(declaration.name),
    ]),
);
const options = (name) => literalOptions(types.get(name));
const members = (value) => new Set(value);

for (const name of [
  "Content",
  "OpenString",
  "OpenNumber",
  "ObjectOrFalse",
  "CallbackOrTrue",
  "Pattern",
  "NullableBroad",
  "UndefinedOnly",
  "Unknown",
  "Any",
])
  test(`${name}: mixed or open types never advertise a literal subset`, () => {
    assert.deepEqual(options(name), []);
  });

test("closed enums, booleans and literal numbers retain every choice", () => {
  assert.deepEqual(members(options("OptionalEnum")), members(["sm", "lg"]));
  assert.deepEqual(members(options("BooleanOnly")), members([false, true]));
  assert.deepEqual(members(options("OptionalBoolean")), members([false, true]));
  assert.deepEqual(members(options("Numbers")), members([0, 1, 2]));
});
test("explicit null remains a choice; undefined is omitted", () => {
  assert.deepEqual(members(options("ClosedNullable")), members([null, "yes"]));
  assert.deepEqual(
    members(options("MixedLiterals")),
    members([null, "auto", 0, false]),
  );
  assert.deepEqual(options("NullOnly"), [null]);
});

const generated = JSON.parse(
  readFileSync("src/gallery/api.generated.json", "utf8"),
);
test("generated ReactNode props and slots never claim false/true exhaust their options", () => {
  let checked = 0;
  for (const component of generated) {
    for (const part of [component, ...component.slots]) {
      for (const prop of part.props ?? []) {
        if (!/\bReactNode\b/.test(prop.type)) continue;
        checked++;
        assert.deepEqual(
          prop.options,
          [],
          `${component.name}.${part.name ?? "props"}.${prop.name}: ${prop.type}`,
        );
      }
    }
  }
  assert.ok(
    checked > 100,
    "Check actual generated content props across the catalogue",
  );
});
test("generated Button size, variant and boolean choices remain complete", () => {
  const button = generated.find((component) => component.name === "Button");
  assert.ok(button, "Button is in the generated API catalogue");
  const prop = (name) => button.props.find((entry) => entry.name === name);
  assert.deepEqual(
    members(prop("size").options),
    members(["xs", "sm", "md", "lg"]),
  );
  assert.deepEqual(
    members(prop("variant").options),
    members([
      "primary",
      "secondary",
      "ghost",
      "soft",
      "danger",
      "danger-soft",
      "success",
      "success-soft",
      "warning",
      "warning-soft",
    ]),
  );
  assert.deepEqual(members(prop("block").options), members([false, true]));
  assert.deepEqual(prop("children").options, []);
});

test("prop origin separates Glass UX, Base UI and React DOM declarations", () => {
  const store = "/repo/node_modules/.pnpm";
  assert.equal(propOrigin("/repo/src/ui/menu/menu.tsx"), "glass-ux");
  assert.equal(
    propOrigin(
      `${store}/@types+react@19.3.0/node_modules/@types/react/index.d.ts`,
    ),
    "react-dom",
  );
  assert.equal(
    propOrigin("C:\\repo\\node_modules\\@types\\react\\global.d.ts"),
    "react-dom",
  );
  assert.equal(
    propOrigin(
      `${store}/@base-ui+react@1.9.0/node_modules/@base-ui/react/menu/trigger/MenuTrigger.d.ts`,
    ),
    "package",
  );
  // A dependency's own src folder is still the dependency, not Glass UX.
  assert.equal(propOrigin("/repo/node_modules/x/src/index.d.ts"), "package");
});

test("React DOM attributes are summarised unless Glass UX documents them", () => {
  assert.equal(listsProp("glass-ux", "onClick"), true);
  assert.equal(listsProp("package", "openOnHover"), true);
  assert.equal(listsProp("react-dom", "aria-label"), false);
  assert.equal(listsProp("react-dom", "onPointerDown"), false);
  assert.equal(listsProp("react-dom", "className"), true);
  assert.equal(listsProp("react-dom", "children"), true);
});

test("printed types name packages, not pnpm store paths", () => {
  assert.equal(
    packageTypePaths(
      'ComponentRenderFn<HTMLProps, import(".pnpm/@base-ui+react@1.9.0_react@19/node_modules/@base-ui/react").ButtonState>',
    ),
    'ComponentRenderFn<HTMLProps, import("@base-ui/react").ButtonState>',
  );
});

test("generated slots list Base UI props, not standard HTML attributes", () => {
  const menu = generated.find((component) => component.name === "Menu");
  const trigger = menu.slots.find((slot) => slot.name === "Trigger");
  const names = new Set(trigger.props.map((prop) => prop.name));
  for (const name of [
    "openOnHover",
    "delay",
    "render",
    "nativeButton",
    "className",
  ])
    assert.ok(names.has(name), `Menu.Trigger keeps ${name}`);
  for (const name of ["aria-label", "onPointerDown", "tabIndex", "key"])
    assert.ok(!names.has(name), `Menu.Trigger omits ${name}`);
  assert.equal(trigger.htmlAttributes, true);
  assert.ok(
    trigger.props.length < 40,
    `Menu.Trigger lists ${trigger.props.length} props`,
  );
  const standard =
    /^(aria-|on(Pointer|Mouse|Touch|Drag|Animation|Transition|Copy|Paste|Wheel)|tabIndex$|dangerouslySetInnerHTML$)/;
  for (const component of generated)
    for (const part of [component, ...component.slots])
      for (const prop of part.props ?? [])
        assert.ok(
          !prop.inherited || !standard.test(prop.name),
          `${component.name}.${part.name ?? "props"} lists ${prop.name}`,
        );
});
