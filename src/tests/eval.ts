import { readFile } from "node:fs/promises";
import { embeddingsFilePath, ollamaBaseUrl, resolveUserPath } from "../config.js";
import type { EmbeddedChunk } from "../lib/types.js";

type TestCase = {
  question: string;
  expectedNotes: string[];  // note titles that SHOULD appear in results
};

// --- Your test set ---
// Edit these to match your actual vault!
// expectedNotes are the note TITLES (no .md extension) that should appear in top results
const TEST_CASES: TestCase[] = [
  {
    question: "What is an API contract?",
    expectedNotes: ["API", "API vs Endpoint"],
  },
  {
    question: "Tell me about data models in TypeScript",
    expectedNotes: ["Data Model"],
  },
  {
    question: "What is tree shaking?",
    expectedNotes: ["Tree Shaking"],
  },
  {
    question: "How does GraphQL work?",
    expectedNotes: ["GraphQL"],
  },
  {
    question: "What's the deal with LaunchDarkly?",
    expectedNotes: ["LaunchDarkly"],
  },
  // Add 5+ more questions based on YOUR vault
];

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    magnitudeA += a[i]! * a[i]!;
    magnitudeB += b[i]! * b[i]!;
  }
  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

async function embed(text: string): Promise<number[]> {
  const response = await fetch(`${ollamaBaseUrl()}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });
  const data = await response.json() as { embedding: number[] };
  return data.embedding;
}

async function evaluateOne(chunks: EmbeddedChunk[], testCase: TestCase, topK: number = 5): Promise<boolean> {
  const questionVector = await embed(testCase.question);

  const scored = chunks
    .map(chunk => ({ chunk, score: cosineSimilarity(questionVector, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Did at least one expected note appear in the top K?
  const retrievedTitles = new Set(scored.map(r => r.chunk.noteTitle));
  const hit = testCase.expectedNotes.some(expected => retrievedTitles.has(expected));

  return hit;
}

async function main() {
  const raw = await readFile(resolveUserPath(embeddingsFilePath()), "utf-8");
  const chunks: EmbeddedChunk[] = JSON.parse(raw);

  console.log(`Running ${TEST_CASES.length} test cases...\n`);

  let passed = 0;
  for (const testCase of TEST_CASES) {
    const hit = await evaluateOne(chunks, testCase);
    const symbol = hit ? "✓" : "✗";
    console.log(`${symbol} "${testCase.question}"`);
    console.log(`   Expected one of: ${testCase.expectedNotes.join(", ")}`);
    if (hit) passed++;
  }

  const score = ((passed / TEST_CASES.length) * 100).toFixed(0);
  console.log(`\n=== Score: ${passed}/${TEST_CASES.length} (${score}%) ===`);
}

main().catch(console.error);