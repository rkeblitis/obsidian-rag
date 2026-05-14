# Decision log

Purpose: capture **context, choice, and tradeoff** for decisions that are not obvious from the code alone. Useful for **future me** (“why did I do that?”) and for **anyone really** who's curious beyond “it works on my machine.”

---

## 2026-05-12: first pass architecture

### TypeScript instead of Python

Python plus a notebook would have been the fastest path for one-off experiments. I chose **TypeScript on Node** with ESM and `tsx` because I wanted the same language I use in product work, with types that travel cleanly across “load a note,” “chunk,” “embedded row,” and CLI entrypoints. The cost is more boilerplate than a notebook. If a future step needs heavy numeric work, I would still keep a thin boundary: stable JSON for the index and env for config, and only the experimental slice in another runtime.

### Ollama for both embeddings and the answer model

**Embeddings** here means: send text to a model, get back a fixed-length list of numbers (a vector). Similar questions and similar note passages tend to land as vectors pointing roughly the same direction in that high-dimensional space. **Generation** is the separate step where `ask.ts` streams an answer from the LLM using retrieved text as context.

I use **Ollama** for both steps so nothing in the default setup phones home to a hosted API. That is great for personal notes and cheap iteration; the tradeoff is you are not on the cutting edge of model quality compared to a frontier hosted chat API. Model names live in env (`EMBEDDING_MODEL`, `GENERATE_MODEL` in `config.ts`) so I can swap deliberately. One thing the code does **not** automatically enforce: if you change the embedding model, you must **rebuild the index** (`embed-vault`). Otherwise you are comparing vectors from different spaces and the scores are meaningless. A stricter version of this project would write the embed model name into each row in `embeddings.json` and refuse to query if it does not match.

### How big each text slice is (chunking)

Models that produce embeddings expect bounded input, so we chop each markdown file into chunks. I landed on about **1000 characters** with **100 characters of overlap** between consecutive windows so a sentence that straddles a boundary is not lost entirely. The splitter tries to cut on nicer boundaries first (paragraph break, then sentence-ish, then line, then space) instead of blind fixed-width slices that split mid-word. That logic lives in `src/lib/vault.ts`.

This is a **heuristic**, not a tokenizer-perfect match to the embedding model’s token limit. For a learning repo and normal-sized notes it has been fine. I would revisit if I switched to a model with a hard small context window or if I saw systematic truncation weirdness in the vectors.

### Cosine similarity and the 0.55 cutoff

Once the question and each note chunk are vectors, retrieval is “score every chunk, sort, take the top few.” **Cosine similarity** compares the *direction* of two vectors (after normalizing length), not raw dot product. Practically: you do not want a longer chunk to win just because its vector has bigger numbers if the *meaning* match is the same.

The **0.55** number is not sacred. I picked it after eyeballing scores: real hits in my vault tended to land higher, and “no good answer in the corpus” queries topped out lower. Any fixed threshold is sensitive to your notes, your questions, and especially **which embedding model** you use. If any of those change, I would re-tune using `query.ts` or the manual eval script, not copy the old constant over by reflex.

### Why the index is a JSON file, not a vector database

For my vault size (on the order of hundreds of chunks, not millions), loading `embeddings.json` into memory and doing a linear scan plus sort is simple, easy to inspect with `jq` or a text editor, and fast enough. A proper **vector database** (or approximate nearest neighbor index) buys you sublinear search and nicer operational features when data gets big or you serve multiple users. I would add one when cold start RAM, latency, or incremental updates become real problems

### Relative paths inside the index

Storing **absolute** file paths in `embeddings.json` would leak machine layout and break the moment you move the vault to a different folder. At index time we store paths **relative to** `VAULT_PATH` (`embed-vault.ts`). As long as you point `VAULT_PATH` at the same tree of files, retrieval still lines up with your disk. If this ever grew into multi-vault or “ship an index as an artifact” territory, I would probably add an explicit vault id per row instead of implying it from env alone.

### How I check quality: eval script vs unit tests

**Unit tests** (`npm test`, under `src/tests/unit/`) answer: did we break pure logic (cosine math, chunking invariants)? They do not talk to Ollama and they do not need my private notes.

**`src/checks/eval.ts`** is different: it is a small, hand-maintained list of questions and “I expect at least one of these note titles to appear in the top K.” That measures whether *this* index and *this* model behave on *my* vault. It is valuable for tuning; it is a poor fit for a public CI gate unless someone checks in a tiny fake vault and matching expectations.

