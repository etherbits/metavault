import { generate_ast, type ASTExpr } from "@etherbits/ezq-web";

type Precedence = "root" | "update" | "or" | "and" | "not";

const precedenceRank: Record<Precedence, number> = {
  root: 0,
  update: 1,
  or: 2,
  and: 3,
  not: 4,
};

export function canonicalizeEzqQuery(input: string) {
  const trimmed = input.trim();
  const query = trimmed === "" ? "/" : trimmed;

  return formatAst(generate_ast(query), "root");
}

function formatAst(ast: ASTExpr, parent: Precedence): string {
  if ("Root" in ast) {
    const expression = formatAst(ast.Root.expression, "root");
    const commands =
      (ast.Root as typeof ast.Root & { commands?: string[] }).commands ?? [];
    const commandText = commands.map((command) => `#${command}`).join(" ");
    return [`/${ast.Root.action}`, expression, commandText]
      .filter(Boolean)
      .join(" ");
  }

  if ("Update" in ast) {
    const selection = formatAst(ast.Update.selection, "update");
    const values = formatAst(ast.Update.values, "update");
    return wrap(`${selection} > ${values}`, "update", parent);
  }

  if ("And" in ast) {
    const expression = ast.And.map((expr) => formatAst(expr, "and"))
      .filter(Boolean)
      .join(" ");
    return wrap(expression, "and", parent);
  }

  if ("Or" in ast) {
    const expression = ast.Or.map((expr) => formatAst(expr, "or"))
      .filter(Boolean)
      .join(" | ");
    return wrap(expression, "or", parent);
  }

  if ("Not" in ast) {
    return wrap(`!${formatAst(ast.Not, "not")}`, "not", parent);
  }

  return ast.Leaf;
}

function wrap(value: string, current: Precedence, parent: Precedence) {
  if (!value) return value;
  return precedenceRank[current] < precedenceRank[parent]
    ? `(${value})`
    : value;
}
