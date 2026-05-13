/** Unit tests for `chunkNote`: in-memory `Note` fixtures (no vault path on disk, no Ollama) */
import assert from "node:assert/strict";
import test from "node:test";
import type { Note } from "../../lib/types.js";
import { CHUNK_SIZE, chunkNote } from "../../lib/vault.js";

// Below CHUNK_SIZE: one slice, chunkIndex 0, title from basename of path
test("short note becomes a single chunk with index 0", () => {
  const content = "Hello world.\n\n".repeat(5);
  const note: Note = { path: "/vault/Short.md", content };
  const chunks = chunkNote(note);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0]!.chunkIndex, 0);
  assert.equal(chunks[0]!.noteTitle, "Short");
  assert.equal(chunks[0]!.text, content);
});

// Above CHUNK_SIZE: sliding window + boundaries should produce multiple chunks; title stable on every row
test("long note yields multiple chunks with stable title", () => {
  const line = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n";
  const content = line.repeat(120);
  assert.ok(
    content.length > CHUNK_SIZE,
    "fixture should exceed CHUNK_SIZE so chunking splits",
  );
  const note: Note = { path: "/notes/LongDoc.md", content };
  const chunks = chunkNote(note);
  assert.ok(chunks.length >= 2, `expected >= 2 chunks, got ${chunks.length}`);
  for (const c of chunks) {
    assert.equal(c.noteTitle, "LongDoc");
    assert.ok(c.text.length > 0);
  }
});
