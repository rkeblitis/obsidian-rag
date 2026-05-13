/**
 * Retrieval debug CLI: embed the question, rank all chunks by cosine similarity, print top matches (no LLM answer).
 * For debugging and learnings
 * Not imported elsewhere — run directly, e.g. `npx tsx src/query.ts "your question"`.
 */
import { loadEmbeddedChunks } from "./lib/embeddings-index.js";
import { embedText } from "./lib/ollama/embed.js";
import { cosineSimilarity } from "./lib/similarity.js";
import type { EmbeddedChunk } from "./lib/types.js";

async function query(question: string, topK: number = 5, threshold: number = 0.55): Promise<void> {
  console.log(`\nQuestion: "${question}"\n`);

  const chunks = await loadEmbeddedChunks();

  // Embed the question
  const questionVector = await embedText(question);

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