/** Reads the vault from disk: recursive .md discovery, load note bodies, boundary-aware chunking. */
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Chunk, Note } from "./types.js";

/** Skip stubs / near-empty notes (non-whitespace length). */
export const MIN_NOTE_CONTENT_LENGTH = 50;

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 100;

/** Recursively collect and return .md paths; skip dot dirs (.obsidian, .trash, .git, …). */
export async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      // Recurse into subfolders
      const nested = await findMarkdownFiles(fullPath);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

// Takes the Markdown file paths and actually loads their content (returns Note objects with both path and content).
export async function loadVault(vaultPath: string): Promise<Note[]> {
  const filePaths = await findMarkdownFiles(vaultPath);
  const notes: Note[] = [];
  
  for (const path of filePaths) {
    const content = await readFile(path, "utf-8");
    
    if (content.trim().length < MIN_NOTE_CONTENT_LENGTH) continue;
    notes.push({ path, content });
  }
  return notes;
}

/** Split one note into chunks (sliding window + overlap; cut points favor paragraph / sentence / line / word). */
export function chunkNote(note: Note): Chunk[] {
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

    // Prefer first boundary in list (paragraph → sentence → line → word) that lies in (minEnd, idealEnd].
    for (const boundary of boundaries) {
      if (boundary > minEnd && boundary > start) {
        end = boundary;
        break;
      }
    }

    // `end` was chosen above; here we take that slice, trim edges, and skip empty slices.
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
