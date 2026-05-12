import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";

const VAULT_PATH = "/Users/rachellekeblitis/The Garden";

// Chunking parameters — these are the knobs you'll tune later
const CHUNK_SIZE = 1000;       // characters per chunk
const CHUNK_OVERLAP = 100;     // characters of overlap between chunks

type Note = {
  path: string;
  content: string;
};

type Chunk = {
  noteTitle: string;   // e.g. "Databricks Interview"
  notePath: string;    // full path on disk
  chunkIndex: number;  // 0, 1, 2... for this note
  text: string;        // the actual chunk content
};

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

// Split a single note into chunks
function chunkNote(note: Note): Chunk[] {
  const chunks: Chunk[] = [];
  const noteTitle = basename(note.path, ".md");
  const content = note.content;

  // If the note is small enough, it's one chunk
  if (content.length <= CHUNK_SIZE) {
    chunks.push({
      noteTitle,
      notePath: note.path,
      chunkIndex: 0,
      text: content,
    });
    return chunks;
  }

  // Otherwise, slide a window of CHUNK_SIZE through the content
  let start = 0;
  let chunkIndex = 0;

  while (start < content.length) {
    // The ideal end point — but we'll look for a better boundary nearby
    const idealEnd = start + CHUNK_SIZE

    // If we're at the end of the content, just take what's left
    if (idealEnd >= content.length) {
        chunks.push({
            noteTitle,
            notePath: note.path,
            chunkIndex,
            text: content.slice(start),
        });
        break;
    }

    // Look for a good boundary, scanning backward from idealEnd
    // We accept boundaries within the last 200 chars of the chunk
    const minEnd = idealEnd - 200;
    let end = idealEnd;

    // Try, in order of preference: paragraph break, sentence end, space
    const boundaries = [
      content.lastIndexOf("\n\n", idealEnd),  // paragraph break
      content.lastIndexOf(". ", idealEnd),    // sentence end
      content.lastIndexOf("\n", idealEnd),    // line break
      content.lastIndexOf(" ", idealEnd),     // word break
    ];

    // Find the best boundary that's within our acceptable range
    for (const boundary of boundaries) {
      if (boundary > minEnd && boundary > start) {
        end = boundary;
        break;
      }
    }

    const text = content.slice(start, end).trim();

    if (text.length > 0) {
      chunks.push({
        noteTitle,
        notePath: note.path,
        chunkIndex,
        text,
      });
      chunkIndex++;
    }
    
    // Move forward, accounting for overlap
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
  }

  return chunks;
}

async function main() {
  const notes = await loadVault(VAULT_PATH);
  console.log(`Loaded ${notes.length} notes\n`);

  // Chunk every note
  const allChunks: Chunk[] = [];
  for (const note of notes) {
    const chunks = chunkNote(note);
    allChunks.push(...chunks);
  }

  console.log(`Created ${allChunks.length} chunks total\n`);

  // Stats
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