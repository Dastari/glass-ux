import ts from "typescript";
import { format } from "prettier";
import { readdirSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";

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
        c.family === "appearance"
          ? "src/lib/appearance/index.ts"
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
            }
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
    for (const statement of story.statements)
      if (
        ts.isExpressionStatement(statement) &&
        ts.isCallExpression(statement.expression) &&
        statement.expression.expression.getText(story) === "registerWindowKind"
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
    const publicCode = output.replace(
      /(from\s+["'])([^"']+)(["'])/g,
      (_m, a, path, b) => {
        if (!path.startsWith(".")) return a + path + b;
        let resolved = relative(
          resolve("src"),
          resolve("src/gallery/demos", path),
        )
          .replaceAll("\\", "/")
          .replace(/\.js$/, "");
        if (/^ui\/[^/]+\/index$/.test(resolved))
          resolved = resolved.split("/")[1];
        else if (resolved === "icons/generated/icons") resolved = "icons";
        else if (/^(ai|shell|windows)\/index$/.test(resolved))
          resolved = resolved.split("/")[0];
        return a + "glass-ux/" + resolved + b;
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
    });
  }
  writeFileSync(
    "src/gallery/demo-coverage.generated.json",
    JSON.stringify(report),
  );
  return report;
}
