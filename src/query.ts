/**
 * Retrieval debug CLI: embed the question, rank all chunks by cosine similarity, print top matches (no LLM answer).
 * For debugging and learnings
 * Not imported elsewhere — run directly, e.g. `npx tsx src/query.ts "your question"`.
 */
import { loadEmbeddedChunks } from "./lib/embeddings-index.js";
import { embedText } from "./lib/ollama/embed.js";
import { rankEmbeddedChunksByCosine } from "./lib/retrieve.js";

async function query(question: string, topK: number = 5, threshold: number = 0.55): Promise<void> {
  console.log(`\nQuestion: "${question}"\n`);

  const chunks = await loadEmbeddedChunks();
  const questionVector = await embedText(question);
  const ranked = rankEmbeddedChunksByCosine(questionVector, chunks);
  const relevant = ranked.filter(r => r.score >= threshold);

  if (relevant.length === 0) {
    console.log(`No chunks scored above ${threshold}. The vault probably doesn't contain a good answer to this question.\n`);
    console.log(`(Top result was ${ranked[0]!.score.toFixed(3)} — too low to trust.)\n`);
    return;
  }

  const topResults = relevant.slice(0, topK);
  
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