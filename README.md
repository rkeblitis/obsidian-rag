# Obsidian RAG

A local semantic search and Q&A system over my Obsidian vault. Runs entirely on
my machine — no API keys, no cloud, no third-party data.

## What it does
Ask questions in plain English; get answers synthesized from my actual notes,
with sources cited.

## How it works
1. Walks the vault and chunks each markdown note (~1000 chars, boundary-aware)
2. Embeds each chunk locally via Ollama (`nomic-embed-text`, 768-dim)
3. Stores embeddings in a JSON file
4. At query time: embeds the question, ranks chunks by cosine similarity,
   filters by threshold, sends top results + question to llama3.2
5. Streams the answer back with source citations

## Setup
[brief — install Ollama, pull these models, npm install, configure VAULT_PATH]

## Usage
[a few example commands]

## Architecture
[a diagram or list of files: list-notes.ts, chunk.ts, embed-vault.ts, ask.ts]

## What I learned / what's interesting about this project
[2-3 sentences about why this isn't a tutorial clone]