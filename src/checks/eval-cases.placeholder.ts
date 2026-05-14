/**
 * Placeholder eval cases for clones and public repos. They are fake note titles; hit rate will
 * usually be low until you add real data.
 *
 * For your own vault (gitignored):
 *   1. Copy this file to `eval-cases.local.ts` in the same folder.
 *   2. Replace `TEST_CASES` with questions and note titles that exist in YOUR embeddings index
 *      (`expectedNotes` = note title strings, no `.md` suffix, as stored in `embeddings.json`).
 *   3. Run `npx tsx src/checks/eval.ts`.
 *
 * `eval-cases.local.ts` is listed in `.gitignore` so your real titles stay off GitHub.
 */
export type EvalTestCase = {
  question: string;
  /** Note titles (no `.md`) that should appear in top-K for a passing hit */
  expectedNotes: string[];
};

/** Safe to commit; not tied to anyone's vault */
export const PLACEHOLDER_EVAL_CASES: EvalTestCase[] = [
  {
    question: "What does the placeholder Example Note Alpha discuss?",
    expectedNotes: ["Example Note Alpha"],
  },
  {
    question: "Summarize Example Note Beta in one sentence.",
    expectedNotes: ["Example Note Beta"],
  },
];
