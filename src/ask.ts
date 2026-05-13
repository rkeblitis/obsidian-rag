/**
 * Full RAG CLI: load the embedding index, retrieve relevant chunks, stream an answer from Ollama (/api/generate).
 * File is for debuging and learning mostly
 * Not imported elsewhere — run directly, e.g. `npx tsx src/ask.ts "your question"`.
 */
import {
  generateModel,
  loadVaultOverviewForPrompt,
  ollamaBaseUrl,
} from "./config.js";
import { loadEmbeddedChunks } from "./lib/embeddings-index.js";
import { embedText } from "./lib/ollama/embed.js";
import { rankEmbeddedChunksByCosine, type ScoredEmbeddedChunk } from "./lib/retrieve.js";

const SIMILARITY_THRESHOLD = 0.55;
const TOP_K = 5;

// --- Retrieval (same as before) ---

async function retrieve(question: string): Promise<ScoredEmbeddedChunk[]> {
  const chunks = await loadEmbeddedChunks();
  const questionVector = await embedText(question);
  const ranked = rankEmbeddedChunksByCosine(questionVector, chunks);
  return ranked
    .filter(r => r.score >= SIMILARITY_THRESHOLD)
    .slice(0, TOP_K);
}


// --- New: Generation step ---

function buildPrompt(
  question: string,
  retrieved: ScoredEmbeddedChunk[],
  vaultOverview: string,
): string {
  const context = retrieved
    .map((r, i) => `[Source ${i + 1}: ${r.chunk.noteTitle}]\n${r.chunk.text}`)
    .join("\n\n---\n\n");

  return `You are answering a question about the user's personal Obsidian vault.

VAULT OVERVIEW:
${vaultOverview}

RELEVANT NOTES (retrieved by semantic search):
${context}

INSTRUCTIONS:
- For questions about the vault as a whole, use the vault overview when it helps.
- For specific questions, use the retrieved notes. Cite which source(s) by name.
- If neither the overview nor the notes contain a clear answer, say so honestly.
- Do not invent facts that aren't in the overview or the notes.

QUESTION: ${question}

ANSWER:`;
}

async function generate(prompt: string): Promise<void> {
  const response = await fetch(`${ollamaBaseUrl()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: generateModel(),
      prompt,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  // Stream the response chunk by chunk
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    // Ollama streams newline-delimited JSON
    const lines = text.split("\n").filter(line => line.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as { response?: string; done?: boolean };
        if (parsed.response) {
          process.stdout.write(parsed.response);
        }
      } catch {
        // Ignore malformed lines (can happen at boundaries)
      }
    }
  }
  process.stdout.write("\n");
}

// --- Main ---

async function ask(question: string): Promise<void> {
  console.log(`\nQuestion: "${question}"\n`);

  console.log("Retrieving relevant notes...");
  const retrieved = await retrieve(question);

  if (retrieved.length === 0) {
    console.log("\nNo relevant notes found in the vault for this question.\n");
    return;
  }

  console.log(`Found ${retrieved.length} relevant chunks:`);
  for (const r of retrieved) {
    console.log(`  - ${r.chunk.noteTitle} (chunk ${r.chunk.chunkIndex}, score ${r.score.toFixed(3)})`);
  }

  const vaultOverview = await loadVaultOverviewForPrompt();
  const prompt = buildPrompt(question, retrieved, vaultOverview);

  console.log("\n--- Answer ---\n");
  await generate(prompt);
  console.log("\n--- Sources used ---");
  for (const r of retrieved) {
    console.log(`  - ${r.chunk.noteTitle}`);
  }
  console.log();
}

const question = process.argv.slice(2).join(" ") || "What is an API contract?";
ask(question).catch(console.error);