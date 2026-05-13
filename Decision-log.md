# Decision log

Purpose: capture **context, choice, and tradeoff** for decisions that are not obvious from the code alone. Useful for **future me** (“why did I do that?”) and for **reviewers** who want signal beyond “it works on my machine.”

Conventions:

- Prefer **problem → decision → tradeoff → reopen when** so skimming is fast.
- Keep claims falsifiable (e.g. link rough scale: chunk count, not “fast” in the abstract).

---

## 2026-05-12

### TypeScript on Node instead of Python

| | |
|---|---|
| **Problem** | Implement RAG with a stack I want to brush up on. |
| **Decision** | TypeScript, ESM, `tsx` for scripts, strict compiler options. |
| **Tradeoff** | More ceremony than a notebook; on the flip side, types help when shapes like `EmbeddedChunk` cross file boundaries. |
| **Reopen when** | Heavy numeric or ML experimentation might push a slice to Python; the API boundaries (index JSON shape, env config) would stay stable. |

### Ollama for embeddings and generation

| | |
|---|---|
| **Problem** | Personal vault: minimize data leaving the machine; keep iteration cheap. |
| **Decision** | Ollama HTTP APIs: `/api/embeddings` for vectors, `/api/generate` for streaming answers in `ask.ts`. |
| **Tradeoff** | Quality and instruction-following are below frontier hosted models; operational burden is local GPU/RAM and model pulls. |
| **Reopen when** | Need stronger answers or tool use: could swap only the generate step, keep local embeddings, or move to a hosted stack with explicit data policy. |

### Chunk size ~1000 characters, overlap 100, boundary-aware splits

| | |
|---|---|
| **Problem** | Embeddings need bounded text; naive fixed windows cut mid word or mid thought. |
| **Decision** | Target window ~1000 chars with 100 overlap; search backward for paragraph, sentence, line, then space before the cut (`src/lib/vault.ts`). |
| **Tradeoff** | Heuristic, not tokenizer-aligned to `nomic-embed-text`; good enough for learning and mid-size notes. |
| **Reopen when** | Switching embedding models with a hard token limit: consider tokenizer-based chunking or smaller `CHUNK_SIZE`. |

### Cosine similarity and a fixed threshold (0.55)

| | |
|---|---|
| **Problem** | Turn vectors into a ranked list and avoid surfacing weak matches as “evidence.” |
| **Decision** | Cosine similarity (direction, not raw dot product); empirically `0.55` separated “good” vs “no confident match” on early queries. |
| **Tradeoff** | Threshold is dataset and model dependent; not portable if the embedding space shifts. |
| **Reopen when** | Change embedding model, chunk size, or domain: re-calibrate with `query.ts` and/or `tests/eval.ts`, not by copying the old number. |

### JSON file index instead of a vector database

| | |
|---|---|
| **Problem** | Persist embeddings and metadata for retrieval. |
| **Decision** | Single `embeddings.json` array loaded into memory; linear scan + sort. |
| **Tradeoff** | Simple and debuggable; RAM and CPU scale with chunk count; no incremental updates or ANN. |
| **Reopen when** | Roughly tens of thousands of chunks, multi-user serving, or need for incremental indexing: SQLite + `vec0`, LanceDB, Qdrant, etc. |

### Relative `notePath` in the index

| | |
|---|---|
| **Problem** | Absolute paths in a committed or shared artifact leak machine layout; couples index to one laptop. |
| **Decision** | At index time, store paths relative to `VAULT_PATH` (`src/embed-vault.ts`). |
| **Tradeoff** | Reopening the vault from a different root is fine as long as `VAULT_PATH` points at the same tree. |
| **Reopen when** | Multi-vault or migration tooling: might add explicit vault id in each row. |

### Shared retrieval helper (`src/lib/retrieve.ts`)

| | |
|---|---|
| **Problem** | Same ranking logic lived in `ask.ts`, `query.ts`, and `tests/eval.ts`; `query.ts` could show top-K hits below the similarity cutoff. |
| **Decision** | One function: rank all chunks by cosine score descending; callers filter / slice (threshold and top-K only in CLIs). |
| **Tradeoff** | Always O(chunks) work per question; acceptable at current scale. |
| **Reopen when** | ANN or batching: replace inner loop, keep the same output shape for callers. |

### Embedding and generate model names from env

| | |
|---|---|
| **Problem** | Hardcoded model strings drift from what is actually pulled; easy to index with one model and query with another by mistake. |
| **Decision** | `EMBEDDING_MODEL` and `GENERATE_MODEL` in `src/config.ts`, used by `embedText` default and `ask.ts` generate body. |
| **Tradeoff** | Still possible to misconfigure env; pairing “rebuild index after embed model change” is a process, not enforced in code. |
| **Reopen when** | Could add a small `embeddingModel` field per index row and assert at load time. |

### Manual eval (`src/tests/eval.ts`) vs automated tests

| | |
|---|---|
| **Problem** | Need some signal that retrieval finds the right notes without maintaining a golden dataset in repo. |
| **Decision** | Script with editable `TEST_CASES` (question + expected note titles); hit rate printed. No CI dependency on a private vault. |
| **Tradeoff** | Not reproducible for external reviewers unless they rewrite cases for their vault. |
| **Reopen when** | Add **unit** tests for pure functions (`similarity`, `chunkNote`) plus optional tiny public fixture index for smoke tests. |
