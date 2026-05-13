# Where I left off — May 12, 2026

## What's working
- Full RAG pipeline: read vault → chunk → embed locally → cosine similarity
  retrieval → threshold filter → llama3.2 generates grounded answer with sources.
- Full vault indexed end-to-end (chunk count and index size vary by vault).
- Meta-question support via vault overview text (default generic prompt; optional `VAULT_OVERVIEW_FILE`).

## What I built today
- src/list-notes.ts — walks vault, lists .md files
- src/load-vault.ts — reads contents, filters empty notes
- src/chunk.ts — boundary-aware chunking (1000 chars, 100 overlap)
- src/embed-test.ts — single-call sanity check
- src/embed-vault.ts — embeds all chunks, saves embeddings.json
- src/query.ts — semantic search with threshold filter
- src/ask.ts — full RAG with LLM answer + sources

## What I learned (just the headlines)
- Embeddings encode meaning as direction in 768-D space, not magnitude.
- Cosine similarity strips magnitude, compares direction.
- Chunking strategy is a knob; boundary-aware > pure size-based.
- Threshold filtering separates "no answer" from "weak answer."
- RAG fails on meta-questions (corpus-level, "what's missing").
- LLMs hallucinate negative information confidently — looks plausible, isn't.

## What's next (in order)
1. Write the learning log + decision log + README (deferred from today)
2. Tighten prompt with "don't speculate about