/**
 * Shared shapes for vault notes, text chunks, and embedding-index rows.
 * Imported by `lib/vault.ts` and by CLIs/tests that read or write `embeddings.json`.
 */

/** One markdown file: path on disk + raw file contents. */
export type Note = {
  path: string;
  content: string;
};

/** One text slice from a note (title / path / index for citations and RAG context). */
export type Chunk = {
  noteTitle: string;
  notePath: string;
  chunkIndex: number;
  text: string;
};

/** Row in embeddings.json: chunk text + vector from Ollama. */
export type EmbeddedChunk = Chunk & {
  embedding: number[];
};
