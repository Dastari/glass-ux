import ts from "typescript";
import { format } from "prettier";
import { readdirSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { entrySpecifiers, publicSpecifier } from "./package-entries.mjs";

/** Extract a selected component's actual specimens, with only reachable declarations/imports. */
export async function generateComponentDemos(program, checker, components) {
  const stories = readdirSync("src/gallery/sections")
    .filter((f) => f.endsWith(".section.tsx"))
    .map((f) => program.getSourceFile(resolve("src/gallery/sections", f)))
    .filter(Boolean);
  const manual = program.getSourceFile(
    resolve("src/gallery/component-examples.tsx"),
  );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const entries = entrySpecifiers();
  mkdirSync("src/gallery/demos", { recursive: true });
  mkdirSync("src/gallery/examples", { recursive: true });
  for (const f of readdirSync("src/gallery/demos"))
    if (f.endsWith(".tsx")) rmSync(`src/gallery/demos/${f}`);
  const report = [];
  const unwrap = (symbol) =>
    symbol?.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  function contains(node, name, visited = new Set()) {
    let found = false;
    const visit = (n) => {
      if (found) return;
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        let tag = n.tagName;
        while (ts.isPropertyAccessExpression(tag)) tag = tag.expression;
        const symbol = unwrap(checker.getSymbolAtLocation(tag));
        const property = ts.isPropertyAccessExpression(n.tagName)
          ? checker.getSymbolAtLocation(n.tagName)
          : undefined;
        const declaration = property?.valueDeclaration;
        const bound =
          declaration && ts.isShorthandPropertyAssignment(declaration)
            ? unwrap(checker.getShorthandAssignmentValueSymbol(declaration))
            : declaration && ts.isPropertyAssignment(declaration)
              ? unwrap(checker.getSymbolAtLocation(declaration.initializer))
              : undefined;
        if (
          (symbol && symbol === symbols.get(name)) ||
          (bound && bound === symbols.get(name))
        ) {
          found = true;
          return;
        }
      }
      if (ts.isIdentifier(n)) {
        const symbol = unwrap(checker.getSymbolAtLocation(n));
        const at = symbol?.valueDeclaration;
        if (
          at &&
          !visited.has(at) &&
          /(?:^|\/)src\/gallery\//.test(at.getSourceFile().fileName) &&
          !at.getSourceFile().fileName.endsWith("/kit.tsx")
        ) {
          visited.add(at);
          if (ts.isFunctionDeclaration(at)) visit(at.body);
          else if (ts.isVariableDeclaration(at) && at.initializer)
            visit(at.initializer);
        }
      }
      if (n) ts.forEachChild(n, visit);
    };
    visit(node);
    return found;
  }
  const symbols = new Map(
    components.map((c) => {
      const file =
        c.family === "appearance" || c.family === "locale"
          ? `src/lib/${c.family}/index.ts`
          : ["ai", "shell", "windows"].includes(c.family)
            ? `src/${c.family}/index.ts`
            : `src/ui/${c.family}/index.ts`;
      const module = checker.getSymbolAtLocation(
        program.getSourceFile(resolve(file)),
      );
      return [
        c.name,
        unwrap(
          checker
            .getExportsOfModule(module)
            .find((s) => s.getName() === c.name),
        ),
      ];
    }),
  );
  const scopes = new Set(["Specimen", "OnCanvas", "ContainerLab"]);
  const removed = new Set(["Rules", "TokenTable"]);
  for (const component of components) {
    const explicit = manual?.statements.find(
      (s) =>
        ts.isFunctionDeclaration(s) &&
        s.name?.text === `${component.name}Example`,
    );
    let story = explicit
      ? manual
      : stories.find(
          (s) =>
            s.fileName.endsWith(`/${component.section}.section.tsx`) &&
            contains(s, component.name),
        );
    story ??= stories.find((s) => contains(s, component.name));
    if (!story) {
      report.push({ id: component.id, name: component.name, covered: false });
      continue;
    }
    const root =
      explicit ??
      story.statements.find((s) =>
        s.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword),
      );
    if (!root || !contains(root, component.name)) {
      report.push({ id: component.id, name: component.name, covered: false });
      continue;
    }
    // Number the specimens of the root in source order, so the same specimen gets the same
    // key in every export's demo. A family document hides a specimen an earlier demo on the
    // page already showed (HiddenSpecimens in demo-scope.ts).
    const rootName = explicit ? explicit.name.text : "default";
    const base = story.fileName.split("/").pop().replace(/\.(section\.)?tsx$/, "");
    const specimenKeys = new Map();
    // A specimen inside a nested function (a .map callback, a render prop) can render more
    // than once, so it has no single identity: leave it unkeyed and never hidden.
    const numberSpecimens = (n) => {
      if (n !== root && (ts.isArrowFunction(n) || ts.isFunctionExpression(n))) return;
      const tag = ts.isJsxElement(n)
        ? n.openingElement.tagName.getText(story)
        : ts.isJsxSelfClosingElement(n)
          ? n.tagName.getText(story)
          : null;
      if (tag && scopes.has(tag)) {
        const attributes = (ts.isJsxElement(n) ? n.openingElement : n).attributes.properties;
        const titleAttribute = attributes.find((a) => ts.isJsxAttribute(a) && a.name.getText(story) === "title");
        const title =
          titleAttribute?.initializer && ts.isStringLiteral(titleAttribute.initializer)
            ? titleAttribute.initializer.text
            : tag === "ContainerLab"
              ? "Container lab"
              : tag;
        specimenKeys.set(n, { key: `${base}:${rootName}:${specimenKeys.size}`, title });
      }
      ts.forEachChild(n, numberSpecimens);
    };
    numberSpecimens(root);
    const kept = [];
    const withKey = (n) => {
      const entry = specimenKeys.get(ts.getOriginalNode(n));
      if (!entry) return n;
      if (!kept.some((k) => k.key === entry.key)) kept.push(entry);
      const attribute = ts.factory.createJsxAttribute(ts.factory.createIdentifier("specimenKey"), ts.factory.createStringLiteral(entry.key));
      if (ts.isJsxElement(n)) {
        const open = n.openingElement;
        return ts.factory.updateJsxElement(
          n,
          ts.factory.updateJsxOpeningElement(open, open.tagName, open.typeArguments, ts.factory.updateJsxAttributes(open.attributes, [...open.attributes.properties, attribute])),
          n.children,
          n.closingElement,
        );
      }
      return ts.factory.updateJsxSelfClosingElement(n, n.tagName, n.typeArguments, ts.factory.updateJsxAttributes(n.attributes, [...n.attributes.properties, attribute]));
    };
    const scope = (node) =>
      ts.transform(node, [
        (context) => {
          const visit = (n) => {
            if (ts.isJsxElement(n)) {
              const tag = n.openingElement.tagName.getText(story);
              if (tag === "SectionPage") {
                const children = n.children.filter(
                  (child) =>
                    ts.isJsxText(child) || contains(child, component.name),
                );
                return ts.visitEachChild(
                  ts.factory.updateJsxElement(
                    n,
                    n.openingElement,
                    children,
                    n.closingElement,
                  ),
                  visit,
                  context,
                );
              }
              if (
                removed.has(tag) ||
                (scopes.has(tag) && !contains(n, component.name))
              )
                return ts.factory.createJsxFragment(
                  ts.factory.createJsxOpeningFragment(),
                  [],
                  ts.factory.createJsxJsxClosingFragment(),
                );
              if (scopes.has(tag)) return withKey(ts.visitEachChild(n, visit, context));
            }
            if (
              ts.isJsxSelfClosingElement(n) &&
              scopes.has(n.tagName.getText(story)) &&
              contains(n, component.name)
            )
              return withKey(n);
            if (
              ts.isJsxSelfClosingElement(n) &&
              removed.has(n.tagName.getText(story))
            )
              return ts.factory.createJsxFragment(
                ts.factory.createJsxOpeningFragment(),
                [],
                ts.factory.createJsxJsxClosingFragment(),
              );
            return ts.visitEachChild(n, visit, context);
          };
          return visit;
        },
      ]).transformed[0];
    const transformed = scope(root);
    const needed = new Set();
    const declarations = new Map();
    function collect(node) {
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        if (symbol && !needed.has(symbol)) {
          needed.add(symbol);
          const at = symbol.valueDeclaration ?? symbol.declarations?.[0];
          if (
            at &&
            at.getSourceFile() === story &&
            !ts.isImportSpecifier(at) &&
            !ts.isImportClause(at) &&
            !ts.isNamespaceImport(at)
          ) {
            let statement = at;
            while (statement.parent && statement.parent !== story)
              statement = statement.parent;
            if (
              statement !== root &&
              story.statements.includes(statement) &&
              !declarations.has(statement)
            ) {
              const scoped = scope(statement);
              declarations.set(statement, scoped);
              collect(scoped);
            }
          }
        }
      }
      ts.forEachChild(node, collect);
    }
    collect(transformed);
    // Module-level window kind registrations: keep those whose kind the demo names (or
    // whose kind is not a literal), so a demo does not carry another demo's kinds.
    const strings = new Set();
    const gatherStrings = (node) => {
      if (ts.isStringLiteralLike(node)) strings.add(node.text);
      ts.forEachChild(node, gatherStrings);
    };
    gatherStrings(transformed);
    for (const scoped of declarations.values()) gatherStrings(scoped);
    const registeredKind = (call) => {
      const [definition] = call.arguments;
      if (!definition || !ts.isObjectLiteralExpression(definition)) return undefined;
      const property = definition.properties.find(
        (p) => ts.isPropertyAssignment(p) && p.name.getText(story) === "kind",
      );
      return property && ts.isStringLiteralLike(property.initializer)
        ? property.initializer.text
        : undefined;
    };
    for (const statement of story.statements)
      if (
        ts.isExpressionStatement(statement) &&
        ts.isCallExpression(statement.expression) &&
        statement.expression.expression.getText(story) === "registerWindowKind" &&
        (registeredKind(statement.expression) === undefined ||
          strings.has(registeredKind(statement.expression)))
      ) {
        declarations.set(statement, statement);
        collect(statement);
      }
    const statements = [];
    for (const statement of story.statements) {
      if (ts.isImportDeclaration(statement)) {
        const clause = statement.importClause;
        if (!clause) continue;
        const defaultName =
          clause.name && needed.has(checker.getSymbolAtLocation(clause.name))
            ? clause.name
            : undefined;
        let bindings = clause.namedBindings;
        if (bindings && ts.isNamedImports(bindings))
          bindings = ts.factory.updateNamedImports(
            bindings,
            bindings.elements.filter((e) =>
              needed.has(checker.getSymbolAtLocation(e.name)),
            ),
          );
        else if (
          bindings &&
          !needed.has(checker.getSymbolAtLocation(bindings.name))
        )
          bindings = undefined;
        if (
          !defaultName &&
          (!bindings ||
            (ts.isNamedImports(bindings) && !bindings.elements.length))
        )
          continue;
        let path = statement.moduleSpecifier.text;
        if (path.startsWith(".")) {
          path = relative(
            resolve("src/gallery/demos"),
            resolve(dirname(story.fileName), path),
          ).replaceAll("\\", "/");
          if (!path.startsWith(".")) path = "./" + path;
        }
        statements.push(
          ts.factory.updateImportDeclaration(
            statement,
            statement.modifiers,
            ts.factory.updateImportClause(
              clause,
              clause.isTypeOnly,
              defaultName,
              bindings,
            ),
            ts.factory.createStringLiteral(path),
            statement.attributes,
          ),
        );
      } else if (declarations.has(statement))
        statements.push(declarations.get(statement));
    }
    let demoRoot = transformed;
    if (explicit)
      demoRoot = ts.factory.updateFunctionDeclaration(
        transformed,
        [
          ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
          ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword),
        ],
        transformed.asteriskToken,
        transformed.name,
        transformed.typeParameters,
        transformed.parameters,
        transformed.type,
        transformed.body,
      );
    statements.push(demoRoot);
    const source = statements
      .map((statement, index) => {
        const previous = statements[index - 1];
        const adjacent =
          previous &&
          ((ts.isImportDeclaration(statement) &&
            ts.isImportDeclaration(previous)) ||
            (ts.isVariableStatement(statement) &&
              ts.isVariableStatement(previous)));
        return (
          (index ? (adjacent ? "\n" : "\n\n") : "") +
          printer.printNode(ts.EmitHint.Unspecified, statement, story)
        );
      })
      .join("");
    const output = (
      await format(source, {
        parser: "typescript",
        printWidth: 100,
      })
    ).trimEnd();
    writeFileSync(
      `src/gallery/demos/${component.id}.tsx`,
      "// Generated by pnpm docs:api. Edit the source specimen instead.\n// oxlint-disable no-unused-vars -- the scoped specimen preserves hook ordering from its source\n" +
        output +
        "\n",
    );
    // The keys only steer the documentation page; usage examples do not show them.
    const publicCode = output.replace(/\s*specimenKey="[^"]*"/g, "").replace(
      /(from\s+["'])([^"']+)(["'])/g,
      (_m, a, path, b) => {
        if (!path.startsWith(".")) return a + path + b;
        const resolved = relative(
          resolve("src"),
          resolve("src/gallery/demos", path),
        )
          .replaceAll("\\", "/")
          .replace(/\.js$/, "");
        const specifier = publicSpecifier(resolved, entries);
        if (!specifier)
          throw new Error(
            `${relative(process.cwd(), story.fileName)}: the ${component.name} demo imports src/${resolved}, which no package entry exports. Import it from the entry's index module, or keep the specimen's internals in a gallery module.`,
          );
        return a + specifier + b;
      },
    );
    writeFileSync(
      `src/gallery/examples/${component.id}.tsx.txt`,
      await format(publicCode, { parser: "typescript", printWidth: 100 }),
    );
    report.push({
      id: component.id,
      name: component.name,
      covered: true,
      source: relative(process.cwd(), story.fileName),
      specimens: kept,
    });
  }
  writeFileSync(
    "src/gallery/demo-coverage.generated.json",
    JSON.stringify(report),
  );
  return report;
}
