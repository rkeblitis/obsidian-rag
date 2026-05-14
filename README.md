# Obsidian RAG

**Retrieve-then-generate** over your own Markdown: embeddings find relevant passages, a **local LLM** (via Ollama) turns them into a streamed answer with citations — the same idea as grounded assistants over private docs, just small and fully on your machine (no cloud APIs in the default setup).

You can use **`query.ts`** for retrieval-only (ranked chunks, no LLM) when debugging; **`ask.ts`** is the full path including generation.

The name reflects how I use it (Obsidian vault); **any directory tree of `.md` files** works as `VAULT_PATH`. The code only cares about recursive `.md` discovery, chunking, and paths — not Obsidian-specific formats. Hidden directories (names starting with `.`, e.g. `.obsidian`, `.git`) are skipped. Markdown is read as **plain text** (e.g. `[[wikilinks]]` are not expanded to filenames).

## Why this repo exists

A **learning build**: I implemented the full path end to end — chunking, embeddings, similarity retrieval, **prompt assembly, and streaming LLM output** — so I could reason about each step and gain insight into data quality and pitfall that are hard to learn by just wiring out of the box soultions. Code stays small enough to read in one sitting.

For **reviewers / future me**: see [Decision-log.md](./Decision-log.md) for tradeoffs and [ROADMAP.md](./ROADMAP.md) for backlog, including **tests, eval set**, and planned meta-question work.

## What it does

- **Index:** walk Markdown under `VAULT_PATH`, boundary-aware chunks (~1000 characters, overlap 100), embed each chunk with Ollama’s **embedding** API, write `embeddings.json` (gitignored by default).
- **Retrieve:** embed the question with the **same** embedding model as the index, rank chunks by cosine similarity, apply a similarity threshold, take top K (`query.ts` stops here).
- **Generate (`ask.ts`):** pass the question plus retrieved excerpts (and optional vault overview) into Ollama’s **`/api/generate`** using `GENERATE_MODEL`; stream tokens to stdout and cite which notes were used.

## How it works (short pipeline)

1. Discover `.md` files under the vault root (hidden directories skipped).
2. Load notes, drop very short stubs, split into chunks with paragraph / sentence / line / word friendly cut points (`src/lib/vault.ts`).
3. Call Ollama `/api/embeddings` per chunk; store vectors plus note title, path **relative to vault root**, chunk index (`src/embed-vault.ts`).
4. At query time: embed the question, sort chunks by cosine similarity (`src/lib/retrieve.ts`), filter by threshold, take top K.
5. **`ask.ts` only:** build a prompt from those chunks (plus optional vault overview), call the **generation model** with streaming (`/api/generate`), so the answer is grounded in what was retrieved — not free‑standing model guesses alone.

## Requirements

- **Node.js** 18+ (uses native `fetch`, ESM).
- **Ollama** running locally, with models pulled for defaults below (or set env overrides).

## Setup

```bash
git clone <this-repo>
cd obsidian-rag
npm install
cp .env.example .env
```

Edit `.env` and set `VAULT_PATH` to the **root folder** that contains your Markdown notes (your Obsidian vault root, or any equivalent tree).

Pull two kinds of models: an **embedding** model (vectors for search) and a **generate** model (the LLM that writes answers). Defaults match [src/config.ts](./src/config.ts):

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

## Configuration (environment)

| Variable | Required | Default | Role |
|----------|----------|---------|------|
| `VAULT_PATH` | Yes (for vault scripts) | — | Root folder for markdown discovery |
| `EMBEDDINGS_FILE` | No | `embeddings.json` | Where the index is written / read |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama HTTP base |
| `EMBEDDING_MODEL` | No | `nomic-embed-text` | Must match index and query time |
| `GENERATE_MODEL` | No | `llama3.2` | Used only by `ask.ts` |
| `VAULT_OVERVIEW_FILE` | No | — | Optional markdown blurb for corpus-level questions in `ask.ts` |

If you change `EMBEDDING_MODEL`, rebuild the index with `embed-vault` so vectors stay comparable.

## Usage

Run from the repo root with `npx tsx`:

| Command | Purpose |
|---------|---------|
| `npm test` | Unit tests (cosine similarity, chunking); no Ollama |
| `npx tsx src/list-notes.ts` | List markdown paths under the vault |
| `npx tsx src/load-vault.ts` | Load vault, print note count |
| `npx tsx src/chunk.ts` | Chunk entire vault, print stats and sample output |
| `npx tsx src/tests/embed-test.ts` | One embedding call against Ollama (sanity check) |
| `npx tsx src/embed-vault.ts` | Build or refresh `embeddings.json` |
| `npx tsx src/query.ts "your question"` | Retrieval only: top matches, no LLM |
| `npx tsx src/ask.ts "your question"` | Retrieve relevant chunks, then **stream an LLM answer** grounded on them (Ollama `/api/generate`) |
| `npx tsx src/tests/eval.ts` | Manual recall-style checks (edit `TEST_CASES` for your vault) |

## Project layout

```
src/
  config.ts              # env, paths, vault overview for prompts
  lib/
    types.ts             # Note, Chunk, EmbeddedChunk
    vault.ts             # discovery, load, chunking
    similarity.ts        # cosine similarity
    retrieve.ts          # rank embedded chunks by question vector
    embeddings-index.ts  # load embeddings.json
    ollama/embed.ts      # embed one string via Ollama
  embed-vault.ts         # CLI: build index
  query.ts               # CLI: debug retrieval
  ask.ts                 # CLI: RAG + generate
  tests/eval.ts          # CLI: vault-specific eval cases
  tests/unit/            # npm test — pure functions
```

## Scope and honesty

- **Unit tests** cover `similarity` and `chunkNote`; they do not replace a **retrieval eval** on your real index (`tests/eval.ts`).
- **Scale:** in-memory scan over a JSON index is fine for hundreds or low thousands of chunks; a vector DB is the next lever if latency or RAM becomes an issue.
- **Git hygiene:** `embeddings.json` holds chunk text and paths — it must stay out of version control (see `.gitignore`). Run `git ls-files embeddings.json` before pushing; it should print nothing. If this file was ever committed, remove it from the index and consider [rewriting history](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) so clones do not retain old blobs.

## Further reading

- [Decision-log.md](./Decision-log.md) — dated tradeoffs and when to reopen them.
- [ROADMAP.md](./ROADMAP.md) — backlog, current snapshot + session notes 