/**
 * EXAMPLE only: rename to `eval-cases.local.ts` (same directory) so `eval.ts` picks it up.
 * The real `eval-cases.local.ts` is gitignored; this file is safe to commit as a template.
 */
import type { EvalTestCase } from "./eval-cases.placeholder.js";

export const TEST_CASES: EvalTestCase[] = [
  {
    question: "Replace with a question that matches a note in your vault",
    expectedNotes: ["Your Note Title Here"],
  },
];
