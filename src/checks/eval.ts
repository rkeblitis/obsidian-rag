/**
 * Manual retrieval eval: run questions against your index and check if expected note titles
 * appear in the top K. Uses `eval-cases.local.ts` when present; otherwise placeholder cases.
 * Run: `npx tsx src/checks/eval.ts`
 */
import { createRequire } from "node:module";
import { loadEmbeddedChunks } from "../lib/embeddings-index.js";
import { embedText } from "../lib/ollama/embed.js";
import { rankEmbeddedChunksByCosine } from "../lib/retrieve.js";
import type { EmbeddedChunk } from "../lib/types.js";
import {
  PLACEHOLDER_EVAL_CASES,
  type EvalTestCase,
} from "./eval-cases.placeholder.js";

const require = createRequire(import.meta.url);

function loadEvalCases(): EvalTestCase[] {
  try {
    const mod = require("./eval-cases.local.js") as { TEST_CASES?: EvalTestCase[] };
    if (Array.isArray(mod.TEST_CASES) && mod.TEST_CASES.length > 0) return mod.TEST_CASES;
  } catch {
    // optional file missing or invalid
  }
  console.log(
    "\n(eval) No eval-cases.local.ts (or it is empty). Using generic placeholders from eval-cases.placeholder.ts.",
  );
  console.log(
    "      Copy eval-cases.local.example.ts to eval-cases.local.ts and edit TEST_CASES for your vault.\n",
  );
  return PLACEHOLDER_EVAL_CASES;
}

async function evaluateOne(chunks: EmbeddedChunk[], testCase: EvalTestCase, topK: number = 5): Promise<boolean> {
  const questionVector = await embedText(testCase.question);
  const ranked = rankEmbeddedChunksByCosine(questionVector, chunks);
  const top = ranked.slice(0, topK);

  const retrievedTitles = new Set(top.map(r => r.chunk.noteTitle));
  return testCase.expectedNotes.some(expected => retrievedTitles.has(expected));
}

async function main() {
  const testCases = loadEvalCases();
  const chunks = await loadEmbeddedChunks();

  console.log(`Running ${testCases.length} test cases...\n`);

  let passed = 0;
  for (const testCase of testCases) {
    const hit = await evaluateOne(chunks, testCase);
    const symbol = hit ? "✓" : "✗";
    console.log(`${symbol} "${testCase.question}"`);
    console.log(`   Expected one of: ${testCase.expectedNotes.join(", ")}`);
    if (hit) passed++;
  }

  const score = ((passed / testCases.length) * 100).toFixed(0);
  console.log(`\n=== Score: ${passed}/${testCases.length} (${score}%) ===`);
}

main().catch(console.error);
