export interface LatexSnippet {
  label: string; // toolbar button text, rendered with KaTeX
  insert: string; // inserted at the cursor
  cursorOffset?: number; // characters from the start of `insert` to place the caret after insertion
}

export interface LatexSnippetGroup {
  title: string;
  snippets: LatexSnippet[];
}

/** 자주 쓰는 LaTeX 기호/템플릿 툴바 (§2-D), 스캔하기 쉽도록 그룹화. */
export const LATEX_SNIPPET_GROUPS: LatexSnippetGroup[] = [
  {
    title: "기본",
    snippets: [
      { label: "\\frac{a}{b}", insert: "\\frac{a}{b}", cursorOffset: 6 },
      { label: "\\sqrt{x}", insert: "\\sqrt{x}", cursorOffset: 6 },
      { label: "x^{n}", insert: "x^{n}", cursorOffset: 3 },
      { label: "x_{i}", insert: "x_{i}", cursorOffset: 3 },
      { label: "\\pm", insert: "\\pm" },
      { label: "\\leq \\geq", insert: "\\leq \\geq" },
    ],
  },
  {
    title: "미적분",
    snippets: [
      { label: "\\int_{a}^{b}", insert: "\\int_{a}^{b} f(x)\\,dx", cursorOffset: 5 },
      { label: "\\sum_{i=1}^{n}", insert: "\\sum_{i=1}^{n} a_i", cursorOffset: 6 },
      { label: "\\lim_{n \\to \\infty}", insert: "\\lim_{n \\to \\infty}", cursorOffset: 5 },
      { label: "\\prod_{i=1}^{n}", insert: "\\prod_{i=1}^{n} a_i", cursorOffset: 6 },
      { label: "\\partial", insert: "\\partial" },
      { label: "\\vec{v}", insert: "\\vec{v}", cursorOffset: 5 },
    ],
  },
  {
    title: "구조",
    snippets: [
      { label: "\\begin{matrix}", insert: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", cursorOffset: 15 },
      { label: "\\begin{cases}", insert: "\\begin{cases} x, & x \\geq 0 \\\\ -x, & x < 0 \\end{cases}", cursorOffset: 13 },
    ],
  },
  {
    title: "그리스 문자 · 기호",
    snippets: [
      { label: "\\alpha \\beta \\theta", insert: "\\alpha \\beta \\theta" },
      { label: "\\pi", insert: "\\pi" },
      { label: "\\infty", insert: "\\infty" },
      { label: "\\in", insert: "\\in" },
      { label: "\\cdot", insert: "\\cdot" },
      { label: "\\times", insert: "\\times" },
    ],
  },
];

export const LATEX_SNIPPETS: LatexSnippet[] = LATEX_SNIPPET_GROUPS.flatMap((g) => g.snippets);
