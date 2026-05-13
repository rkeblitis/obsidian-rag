/**
 * Debug chunking: stats + sample output. Tuning knobs live in ./lib/vault.ts (CHUNK_SIZE / CHUNK_OVERLAP).
 */
import { requireVaultPath } from "./config.js";
import { chunkNote, loadVault, type Chunk } from "./lib/vault.js";

async function main() {
  const notes = await loadVault(requireVaultPath());
  console.log(`Loaded ${notes.length} notes\n`);

  // Chunk every note
  const allChunks: Chunk[] = [];
  for (const note of notes) {
    allChunks.push(...chunkNote(note));
  }

  // Stats
  console.log(`Created ${allChunks.length} chunks total\n`);
  const noteChunkCounts = new Map<string, number>();
  for (const chunk of allChunks) {
    noteChunkCounts.set(chunk.noteTitle, (noteChunkCounts.get(chunk.noteTitle) ?? 0) + 1);
  }

  // Find notes that were split into multiple chunks
  const splitNotes = [...noteChunkCounts.entries()]
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  console.log(`Notes split into multiple chunks: ${splitNotes.length}`);
  for (const [title, count] of splitNotes.slice(0, 5)) {
    console.log(`  ${title}: ${count} chunks`);
  }

  // Show a sample chunk
  // Show a detailed view of the first chunk of the longest note
  console.log(`\n--- Sample chunk (first chunk of longest note) ---`);
  const sample = allChunks.find(c => c.noteTitle === "Databricks Interview");
  if (sample) {
    console.log(`From: ${sample.noteTitle} (chunk ${sample.chunkIndex})`);
    console.log(`Length: ${sample.text.length} chars`);
    console.log(`Starts with: "${sample.text.slice(0, 100)}..."`);
    console.log(`Ends with: "...${sample.text.slice(-100)}"`);
  }

  console.log("\n--- More sample chunks ---");
  for (const chunk of allChunks.slice(0, 3)) {
    console.log(`\n[${chunk.noteTitle} chunk ${chunk.chunkIndex}]`);
    console.log(chunk.text.slice(0, 200) + "...");
    console.log(`(ends with: "${chunk.text.slice(-50)}")`);
  }
}

main().catch(console.error);
