import ts from "typescript";

/** Files with browser behaviour become client boundaries; re-export barrels stay neutral. */
export function needsClientBoundary(text, file = "module.tsx") {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const reactCalls = new Set(["use", "createContext", "createPortal"]);
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.importClause?.isTypeOnly
    )
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings))
      for (const item of bindings.elements) {
        const imported = (item.propertyName ?? item.name).text;
        if (
          !item.isTypeOnly &&
          (/^use[A-Z]/.test(imported) || reactCalls.has(imported))
        )
          reactCalls.add(item.name.text);
      }
  }
  let client = false;
  const visit = (node, inFunction = false, inComponent = false) => {
    if (ts.isCallExpression(node)) {
      const name = ts.isIdentifier(node.expression)
        ? node.expression.text
        : ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : "";
      if (/^use[A-Z]/.test(name) || reactCalls.has(name)) client = true;
    }
    if (
      ts.isImportDeclaration(node) &&
      !node.importClause?.isTypeOnly &&
      node.importClause
    ) {
      const bindings = node.importClause.namedBindings;
      const runtime =
        !bindings ||
        !ts.isNamedImports(bindings) ||
        bindings.elements.some((e) => !e.isTypeOnly);
      if (
        runtime &&
        /^@base-ui\/react\/(?!merge-props|use-render)/.test(
          node.moduleSpecifier.text,
        )
      )
        client = true;
    }
    if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText(source)))
      client = true;
    // DOM helpers called explicitly by an application can remain server-importable. A DOM
    // read at module scope cannot. `typeof window` is an SSR guard, not a DOM read.
    if (
      (!inFunction || inComponent) &&
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["window", "document"].includes(node.expression.text)
    )
      client = true;
    const component =
      (ts.isFunctionDeclaration(node) &&
        /^[A-Z]/.test(node.name?.text ?? "")) ||
      (ts.isVariableDeclaration(node) &&
        /^[A-Z]/.test(node.name.getText(source)) &&
        node.initializer &&
        ts.isArrowFunction(node.initializer));
    ts.forEachChild(node, (child) =>
      visit(
        child,
        inFunction || ts.isFunctionLike(node),
        inComponent || Boolean(component),
      ),
    );
  };
  visit(source);
  return client;
}

/** Emit client directives and portable development checks through tsc, retaining source maps. */
export function libraryTransformer(onBoundary = () => {}) {
  return (context) => (source) => {
    const factory = context.factory;
    const visit = (node) => {
      if (
        ts.isPropertyAccessExpression(node) &&
        node.name.text === "DEV" &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "env" &&
        ts.isMetaProperty(node.expression.expression) &&
        node.expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword
      ) {
        return ts.setTextRange(
          factory.createParenthesizedExpression(
            factory.createBinaryExpression(
              factory.createPropertyAccessExpression(
                factory.createPropertyAccessExpression(
                  factory.createIdentifier("process"),
                  "env",
                ),
                "NODE_ENV",
              ),
              ts.SyntaxKind.ExclamationEqualsEqualsToken,
              factory.createStringLiteral("production"),
            ),
          ),
          node,
        );
      }
      return ts.visitEachChild(node, visit, context);
    };
    const updated = ts.visitNode(source, visit);
    if (!needsClientBoundary(source.text, source.fileName)) return updated;
    onBoundary();
    if (
      source.statements.some(
        (statement) =>
          ts.isExpressionStatement(statement) &&
          ts.isStringLiteral(statement.expression) &&
          statement.expression.text === "use client",
      )
    )
      return updated;
    return factory.updateSourceFile(updated, [
      factory.createExpressionStatement(
        factory.createStringLiteral("use client"),
      ),
      ...updated.statements,
    ]);
  };
}
