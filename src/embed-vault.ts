import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";

const VAULT_PATH = "/Users/rachellekeblitis/The Garden";
const OUTPUT_FILE = "embeddings.json";
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;

type Note = {
  path: string;
  content: string;
};

type Chunk = {
  noteTitle: string;
  notePath: string;
  chunkIndex: number;
  text: string;
};

type EmbeddedChunk = Chunk & {
  embedding: number[];
};

// --- File loading and chunking (same as before) ---

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      results.push(...await findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

async function loadVault(vaultPath: string): Promise<Note[]> {
  const filePaths = await findMarkdownFiles(vaultPath);
  const notes: Note[] = [];
  for (const path of filePaths) {
    const content = await readFile(path, "utf-8");
    if (content.trim().length < 50) continue;
    notes.push({ path, content });
  }
  return notes;
}

function chunkNote(note: Note): Chunk[] {
  const chunks: Chunk[] = [];
  const noteTitle = basename(note.path, ".md");
  const content = note.content;

  if (content.length <= CHUNK_SIZE) {
    chunks.push({ noteTitle, notePath: note.path, chunkIndex: 0, text: content });
    return chunks;
  }

  let start = 0;
  let chunkIndex = 0;

  while (start < content.length) {
    const idealEnd = start + CHUNK_SIZE;

    if (idealEnd >= content.length) {
      chunks.push({
        noteTitle,
        notePath: note.path,
        chunkIndex,
        text: content.slice(start),
      });
      break;
    }

    const minEnd = idealEnd - 200;
    let end = idealEnd;

    const boundaries = [
      content.lastIndexOf("\n\n", idealEnd),
      content.lastIndexOf(". ", idealEnd),
      content.lastIndexOf("\n", idealEnd),
      content.lastIndexOf(" ", idealEnd),
    ];

    for (const boundary of boundaries) {
      if (boundary > minEnd && boundary > start) {
        end = boundary;
        break;
      }
    }

    const text = content.slice(start, end).trim();
    if (text.length > 0) {
      chunks.push({ noteTitle, notePath: note.path, chunkIndex, text });
      chunkIndex++;
    }

    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
  }

  return chunks;
}

// --- New: embedding logic ---

async function embed(text: string): Promise<number[]> {
  const response = await fetch("http://localhost:11434/api/embeddings", {
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

async function embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  const results: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;

    // Progress indicator
    if (i % 10 === 0) {
      console.log(`  Embedded ${i}/${chunks.length}...`);
    }

    const embedding = await embed(chunk.text);
    results.push({ ...chunk, embedding });
  }

  console.log(`  Embedded ${chunks.length}/${chunks.length} ✓`);
  return results;
}

// --- Main ---

async function main() {
  console.log(`Loading vault from ${VAULT_PATH}...`);
  const notes = await loadVault(VAULT_PATH);
  console.log(`Loaded ${notes.length} notes\n`);

  console.log(`Chunking...`);
  const allChunks: Chunk[] = [];
  for (const note of notes) {
    allChunks.push(...chunkNote(note));
  }
  console.log(`Created ${allChunks.length} chunks\n`);

  console.log(`Embedding ${allChunks.length} chunks...`);
  const startTime = Date.now();
  const embedded = await embedChunks(allChunks);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Done in ${elapsed}s\n`);

  // Save to disk
  console.log(`Saving to ${OUTPUT_FILE}...`);
  await writeFile(OUTPUT_FILE, JSON.stringify(embedded, null, 2));

  // Stats
  const fileSize = (Buffer.byteLength(JSON.stringify(embedded)) / 1024 / 1024).toFixed(2);
  console.log(`Saved ${embedded.length} embedded chunks (${fileSize} MB)`);
}

main().catch(console.error);