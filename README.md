# Obsidian RAG
**Retrieve-then-generate** over your own Markdown: embeddings find relevant passages, a **local LLM** (via Ollama) turns them into a streamed answer with citations: the same idea as grounded assistants over private docs, just small and fully on your machine (no cloud APIs in the default setup).

## Why this repo exists

A **learning build**: I implemented the full path end to end: chunking, embeddings, similarity retrieval, **prompt assembly, and streaming LLM output**, so I could reason about each step and gain insight into data quality and pitfalls that are hard to learn by just wiring out-of-the-box solutions. Code stays small enough to read in one sitting.

For **reviewers / future me**: see [Decision-log.md](./Decision-log.md) for tradeoffs and [ROADMAP.md](./ROADMAP.md) for backlog, agent/tool direction, and session notes.

## What it does

1. **Index** — walk `.md` files under `VAULT_PATH` (hidden directories skipped), split into boundary-aware chunks (~1000 characters, overlap 100), embed each with Ollama's embedding API, write `embeddings.json` (gitignored by default). Chunking logic lives in `src/lib/vault.ts`.
2. **Retrieve** — embed the question with the same embedding model as the index, rank chunks by cosine similarity, apply a threshold, take top K. `query.ts` stops here.
3. **Generate** — `ask.ts` passes the question plus retrieved excerpts (and optional vault overview) into Ollama's `/api/generate`, streams tokens to stdout, and cites which notes were used. The answer is anchored in what was retrieved vs the model's guesses alone

## Requirements

- **Node.js** 18+ (uses native `fetch`, ESM).
- **Ollama** running locally, with an embedding model and a generate model pulled (*or if you want a different model, use the env overrides*)

## Setup

```
git clone <this-repo>
cd obsidian-rag
npm install
cp .env.example .env
```

Edit `.env` and set `VAULT_PATH` to the **root folder** that contains your Markdown notes (your Obsidian vault root, or any equivalent tree). Then pull an **embedding** model and a **generate** model

```
ollama pull nomic-embed-text
ollama pull llama3.2
```
All other config is via `.env` — see [`.env.example`](./.env.example) and [`src/config.ts`](./src/config.ts) for the full list and defaults. If you change the embedding model, rebuild the index with `embed-vault` so vectors stay comparable.

The pipeline is split so you can run it incrementally and inspect the data at each step: `query.ts` does retrieval only — ranked chunks, no LLM — which is useful for debugging or just seeing what the embeddings actually match before generation enters the picture. `ask.ts` is the full path including the streamed answer.

The name reflects how I use it (Obsidian vault); **any directory tree of `.md` files** works as `VAULT_PATH`. The code only cares about recursive `.md` discovery, chunking, and paths, not Obsidian-specific formats. Hidden directories (names starting with `.`, e.g. `.obsidian`, `.git`) are skipped. Markdown is read as **plain text** (e.g. `[[wikilinks]]` are not expanded to filenames *yet* :)).

## Configuration

Full variable list and defaults live in [`.env.example`](./.env.example) and [`src/config.ts`](./src/config.ts) — no point repeating them here. But I think two things worth knowing that the list won't tell you:

- **`EMBEDDING_MODEL` is load-bearing.** It has to be the same at index time and query time. Change it without rebuilding the index (`embed-vault`) and you're comparing vectors from two different embedding spaces. The retrieval still runs, scores still come back, **they're just meaningless, so yea don't do that**. The code doesn't currently enforce this; see [Decision-log.md](./Decision-log.md) for why, and what a stricter version would do.
- **The 0.55 similarity threshold isn't a universal constant.** It was picked by me eyeballing the scores on my vault with this embedding model. Different notes or a different model will shift where "good match" actually falls, so re-tune rather than inheriting the number.

## Usage

Run from the repo root with `npx tsx`. The CLIs are deliberately split so you can walk the pipeline one stage at a time and inspect what each step produces (if you want). Or you can just run the whole thing and trust it

**The main path:**

| Command | Purpose |
| --- | --- |
| `npx tsx src/embed-vault.ts` | Build or refresh `embeddings.json` |
| `npx tsx src/query.ts "your question"` | Retrieval only — ranked chunks, no LLM. Flags: `--peek N`, `--full`, `--top N`, `--threshold T`, `--help` |
| `npx tsx src/ask.ts "your question"` | Full RAG: retrieve, then stream a grounded answer |
| `npm test` | Unit tests (cosine similarity, chunking); no Ollama needed |

For debugging retrieval (why did *these* chunks win?), use `query.ts` flags: `--peek N` shows the top N chunks by raw score ignoring the threshold, `--full` prints full chunk text instead of a preview, `--threshold T` overrides the default cutoff. Run `npx tsx src/query.ts --help` for the full list.

**Inspecting earlier stages** — useful when something looks off, or just to see the data:

| Command | Purpose |
| --- | --- |
| `npx tsx src/list-notes.ts` | List markdown paths found under the vault |
| `npx tsx src/load-vault.ts` | Load the vault, print note count |
| `npx tsx src/chunk.ts` | Chunk the whole vault, print stats and a sample |
| `npx tsx src/checks/embed-test.ts` | One embedding call against Ollama (sanity check) |
| `npx tsx src/checks/eval.ts` | Manual retrieval checks against your own expectations |

Optional: copy `src/checks/eval-cases.local.example.ts` to `src/checks/eval-cases.local.ts` and edit `TEST_CASES` (that file is gitignored). If you still have `src/tests/eval-cases.local.ts` from an older layout, move it to `src/checks/eval-cases.local.ts`.

## Project layout

The split is deliberate: pure logic in `lib/` (testable without Ollama or your notes), thin CLI entrypoints at the top level, each doing one stage of the pipeline.

```
src/
  config.ts              # env, paths, vault overview for prompts
  lib/                   # pure logic — no I/O, no Ollama, unit-testable
    types.ts             # Note, Chunk, EmbeddedChunk
    vault.ts             # discovery, load, chunking
    similarity.ts        # cosine similarity
    retrieve.ts          # rank embedded chunks by question vector
    embeddings-index.ts  # load embeddings.json
    ollama/embed.ts      # embed one string via Ollama
  embed-vault.ts         # CLI: build index
  query.ts               # CLI: retrieval only (debug / inspect)
  ask.ts                 # CLI: full RAG + generate
  checks/embed-test.ts   # CLI: Ollama embed sanity (manual; needs Ollama)
  checks/eval.ts         # CLI: retrieval eval (manual; optional eval-cases.local.ts)
  tests/unit/            # npm test: pure functions, no network
```

## Scope and honest tradeoffs

This is a learning build, so some choices are intentionally "good enough" rather than production-grade. Just explaining upfront about which ones rather than have y'all guess

- **Flat JSON index, not a vector database.** Fine for hundreds of chunks, where a linear scan is simple and easy to inspect. I'd reach for a real vector DB once cold-start RAM, latency, or incremental updates became actual problems, not before.
- **Heuristic chunking, not tokenizer-exact.** Roughly 1000 characters with boundary-aware cut points. Good enough for normal-sized notes; I'd revisit for a model with a tight context window.
- **A single hardcoded similarity threshold (0.55).** Picked by eyeballing scores on my own vault. It's sensitive to your notes and your embedding model, so any change there means re-tuning, not copying the constant over.
- **Pure single-turn retrieval.** One embed, one rank, one prompt. No reranking, no query rewriting, no agent loop yet. See [ROADMAP.md](./ROADMAP.md) for where that goes next.
- **Unit tests cover pure logic, not retrieval quality.** `npm test` guards cosine math and chunking invariants by design; measuring whether retrieval actually returns the right chunks is a separate job, handled by the eval script (`src/checks/eval.ts`).

Full reasoning for each design choice is in [Decision-log.md](./Decision-log.md) (dated tradeoffs and when to reopen them). See [ROADMAP.md](./ROADMAP.md) for backlog, current snapshot, and session notes. 

Thanks and have fun with it!
