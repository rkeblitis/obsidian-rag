/**
 * Retrieval debug CLI: embed the question, rank all chunks by cosine similarity, print top matches (no LLM answer).
 * For debugging and learnings
 * Not imported elsewhere — run directly, e.g. `npx tsx src/query.ts "your question"`.
 */
import { readFile } from "node:fs/promises";
import { embeddingsFilePath, ollamaBaseUrl, resolveUserPath } from "./config.js";

type EmbeddedChunk = {
  noteTitle: string;
  notePath: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
};

// Cosine similarity: measures how similar two vectors are in direction.
// Returns a value between -1 and 1. Higher = more similar.
// 1 = identical direction, 0 = perpendicular (unrelated), -1 = opposite.
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
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
  }

  const data = await response.json() as { embedding: number[] };
  return data.embedding;
}

async function loadEmbeddings(): Promise<EmbeddedChunk[]> {
  const raw = await readFile(resolveUserPath(embeddingsFilePath()), "utf-8");
  return JSON.parse(raw) as EmbeddedChunk[];
}

async function query(question: string, topK: number = 5, threshold: number = 0.55): Promise<void> {
  console.log(`\nQuestion: "${question}"\n`);

  // Load the index
  const chunks = await loadEmbeddings();

  // Embed the question
  const questionVector = await embed(question);

  // Score every chunk by similarity to the question
  const scored = chunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(questionVector, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  
  // Filter by threshold
  const relevant = scored.filter(r => r.score >= threshold);

  if (relevant.length === 0) {
    console.log(`No chunks scored above ${threshold}. The vault probably doesn't contain a good answer to this question.\n`);
    console.log(`(Top result was ${scored[0]!.score.toFixed(3)} — too low to trust.)\n`);
    return;
  }
  
  // Sort by score, take top K
  const topResults = scored.slice(0, topK);
  
  // Display results
  console.log(`Found ${relevant.length} relevant chunks (showing top ${topResults.length}):\n`);
  for (let i = 0; i < topResults.length; i++) {
    const { chunk, score } = topResults[i]!;
    console.log(`${i + 1}. [${score.toFixed(3)}] ${chunk.noteTitle} (chunk ${chunk.chunkIndex})`);
    console.log(`   ${chunk.text.slice(0, 150).replace(/\n/g, " ")}...`);
    console.log();
  }
}

// --- Run a question ---
// Change this to ask different things
const question = process.argv.slice(2).join(" ") || "What is an API contract?";

query(question).catch(console.error);