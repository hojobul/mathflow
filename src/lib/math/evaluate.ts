/**
 * Minimal safe arithmetic expression evaluator for interactive graph
 * widgets (e.g. `"a*x^2 + b*x + c"`). Deliberately not `eval`/`Function`:
 * parses a small grammar (+ - * / ^, parens, unary minus, a few named
 * functions) into an AST once, then evaluates it against a variable scope
 * many times per render (once per sample point) without re-parsing.
 *
 * Grammar (lowest to highest precedence — note unary minus sits *below*
 * "^", matching convention: "-x^2" parses as "-(x^2)", not "(-x)^2"):
 *   expr   := term (("+" | "-") term)*
 *   term   := unary (("*" | "/") unary)*
 *   unary  := "-" unary | power
 *   power  := atom ("^" unary)?         // right-associative; exponent may itself be signed (2^-1)
 *   atom   := number | ident | ident "(" expr ")" | "(" expr ")"
 */

type Node =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "call"; fn: string; arg: Node }
  | { kind: "bin"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { kind: "neg"; value: Node };

const FUNCTIONS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  log: Math.log,
  exp: Math.exp,
};

export class ExpressionError extends Error {}

export function compileExpression(source: string): (scope: Record<string, number>) => number {
  const ast = parse(source);
  return (scope) => evalNode(ast, scope);
}

function evalNode(node: Node, scope: Record<string, number>): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "var": {
      const v = scope[node.name];
      if (v === undefined) throw new ExpressionError(`알 수 없는 변수: ${node.name}`);
      return v;
    }
    case "neg":
      return -evalNode(node.value, scope);
    case "call": {
      const fn = FUNCTIONS[node.fn];
      if (!fn) throw new ExpressionError(`알 수 없는 함수: ${node.fn}`);
      return fn(evalNode(node.arg, scope));
    }
    case "bin": {
      const l = evalNode(node.left, scope);
      const r = evalNode(node.right, scope);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case "^":
          return Math.pow(l, r);
      }
    }
  }
}

// --- tokenizer + recursive-descent parser ---

type Token = { type: "num"; value: number } | { type: "ident"; name: string } | { type: "op"; op: string };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < source.length && /[0-9.]/.test(source[j])) j++;
      const value = Number(source.slice(i, j));
      if (Number.isNaN(value)) throw new ExpressionError(`잘못된 숫자: ${source.slice(i, j)}`);
      tokens.push({ type: "num", value });
      i = j;
    } else if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < source.length && /[a-zA-Z0-9_]/.test(source[j])) j++;
      tokens.push({ type: "ident", name: source.slice(i, j) });
      i = j;
    } else if ("+-*/^(),".includes(c)) {
      tokens.push({ type: "op", op: c });
      i++;
    } else {
      throw new ExpressionError(`지원하지 않는 문자: "${c}"`);
    }
  }
  return tokens;
}

function parse(source: string): Node {
  const tokens = tokenize(source);
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr(): Node {
    let node = parseTerm();
    while (peek() && peek().type === "op" && ((peek() as { op: string }).op === "+" || (peek() as { op: string }).op === "-")) {
      const op = (next() as { op: string }).op as "+" | "-";
      node = { kind: "bin", op, left: node, right: parseTerm() };
    }
    return node;
  }

  function parseTerm(): Node {
    let node = parseUnary();
    while (peek() && peek().type === "op" && ((peek() as { op: string }).op === "*" || (peek() as { op: string }).op === "/")) {
      const op = (next() as { op: string }).op as "*" | "/";
      node = { kind: "bin", op, left: node, right: parseUnary() };
    }
    return node;
  }

  // Unary minus binds looser than "^" (so "-x^2" is "-(x^2)", matching
  // standard math convention), but tighter than "*"/"/".
  function parseUnary(): Node {
    if (peek() && peek().type === "op" && (peek() as { op: string }).op === "-") {
      next();
      return { kind: "neg", value: parseUnary() };
    }
    return parsePower();
  }

  function parsePower(): Node {
    const base = parseAtom();
    if (peek() && peek().type === "op" && (peek() as { op: string }).op === "^") {
      next();
      return { kind: "bin", op: "^", left: base, right: parseUnary() }; // right-assoc; exponent may itself be signed (2^-1)
    }
    return base;
  }

  function parseAtom(): Node {
    const tok = peek();
    if (!tok) throw new ExpressionError("수식이 예상보다 일찍 끝났어요");

    if (tok.type === "num") {
      next();
      return { kind: "num", value: tok.value };
    }
    if (tok.type === "ident") {
      next();
      if (peek() && peek().type === "op" && (peek() as { op: string }).op === "(") {
        next(); // consume "("
        const arg = parseExpr();
        if (!peek() || (peek() as { op: string }).op !== ")") throw new ExpressionError("닫는 괄호가 없어요");
        next();
        return { kind: "call", fn: tok.name, arg };
      }
      return { kind: "var", name: tok.name };
    }
    if (tok.type === "op" && tok.op === "(") {
      next();
      const inner = parseExpr();
      if (!peek() || (peek() as { op: string }).op !== ")") throw new ExpressionError("닫는 괄호가 없어요");
      next();
      return inner;
    }
    throw new ExpressionError(`예상치 못한 토큰: ${JSON.stringify(tok)}`);
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new ExpressionError("수식 끝에 남은 문자가 있어요");
  return result;
}
