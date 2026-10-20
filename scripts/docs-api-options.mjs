import ts from "typescript";

/**
 * Only advertise choices when they exhaust the accepted values. Undefined represents
 * omission and is not a choice; explicit null remains a value in a closed union.
 * Broad primitives, objects, callbacks and type parameters require reading the type.
 */
export function literalOptions(type) {
  const members = type.isUnion() ? type.types : [type];
  const options = [];
  for (const member of members) {
    if (member.flags & ts.TypeFlags.Undefined) continue;
    if (member.isStringLiteral() || member.isNumberLiteral()) {
      options.push(member.value);
    } else if (member.flags & ts.TypeFlags.BooleanLiteral) {
      options.push(member.intrinsicName === "true");
    } else if (member.flags & ts.TypeFlags.Null) {
      options.push(null);
    } else {
      return [];
    }
  }
  return options;
}

/**
 * Where a prop is declared, from its declaration's file name: `"glass-ux"` for this
 * package's source, `"react-dom"` for React's DOM typings (HTMLAttributes, AriaAttributes,
 * DOMAttributes, SVGAttributes, RefAttributes and the rest of `@types/react`), and
 * `"package"` for any other dependency, such as Base UI.
 */
export function propOrigin(fileName) {
  const file = fileName.replaceAll("\\", "/");
  if (file.includes("/node_modules/@types/react/")) return "react-dom";
  if (file.includes("/node_modules/")) return "package";
  return file.includes("/src/") ? "glass-ux" : "package";
}

/**
 * React DOM props the API reference still lists, because Glass UX gives them documented
 * behaviour: content, layout class, ref, and form or control state.
 */
export const LISTED_REACT_PROPS = new Set([
  "children",
  "className",
  "ref",
  "value",
  "defaultValue",
  "disabled",
  "readOnly",
  "required",
  "name",
  "placeholder",
]);

/**
 * Whether the API reference lists a prop. Props declared by Glass UX or another package
 * (Base UI) are always listed; standard React DOM attributes are summarised by a note on
 * the component or slot instead, except {@link LISTED_REACT_PROPS}.
 */
export function listsProp(origin, name) {
  return origin !== "react-dom" || LISTED_REACT_PROPS.has(name);
}

/** The note shown wherever a component or slot also accepts unlisted HTML attributes. */
export const HTML_ATTRIBUTES_NOTE =
  "Also accepts the element’s standard HTML attributes and React DOM events.";

/** Rewrites pnpm store paths in printed types, `import(".pnpm/x@1/node_modules/x")`, to `import("x")`. */
export function packageTypePaths(type) {
  return type.replace(
    /import\("\.pnpm\/[^"]*?\/node_modules\/([^"]+)"\)/g,
    'import("$1")',
  );
}
