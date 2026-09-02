# @dlabz/jsdoc-dts-rag

> Continuous JSDoc to `.d.ts` + Markdown compilation pipeline with **AST symbol graph extraction**, real-time **RAG vector store synchronization**, and **AI context efficiency skills & rules**.

```
                  ┌────────────────┐
                  │ JSDoc JS / TS  │
                  └───────┬────────┘
                          │ (chokidar watcher)
            ┌─────────────┴─────────────┐
            ▼                           ▼
    ┌───────────────┐           ┌───────────────┐
    │ dist/types/   │           │  dist/docs/   │
    │    *.d.ts     │           │     *.md      │
    └───────┬───────┘           └───────┬───────┘
            │                           │
            ├─────────────┬─────────────┤
            ▼                           ▼
    ┌───────────────┐           ┌───────────────┐
    │  AST Graph    │           │Semantic Chunk │
    │ JSON+Mermaid  │           │Symbol Level   │
    └───────┬───────┘           └───────┬───────┘
            │                           │
            └─────────────┬─────────────┘
                          ▼
             ┌─────────────────────────┐
             │  Local Embeddings       │
             │ Xenova/all-MiniLM-L6-v2 │
             └────────────┬────────────┘
                          ▼
             ┌─────────────────────────┐
             │  RAG Vector Store       │
             │ Real-time Sync & Query  │
             └─────────────────────────┘
```

---

## Why this tool?

### 1. Zero-Friction Types & Docs from Plain JavaScript
Write clean, standard JSDoc comments in your JavaScript/TypeScript codebase. This tool uses the TypeScript Compiler API to continuously compile:
- **TypeScript Declaration Files (`.d.ts`)**: Stored in `dist/types/` with full type fidelity.
- **RAG-Optimized Markdown Documentation**: Stored in `dist/docs/` with parameter tables, signatures, return types, `@example` blocks, and `@deprecated` badges.

### 2. `.d.ts` AST Symbol & Dependency Graph
Unlike simple text search, the pipeline parses your emitted `.d.ts` declarations to construct a directed symbol relationship graph:
- **`dist/graph/ast-graph.json`**: Machine-readable node-link graph mapping functions, classes, interfaces, type aliases, methods, parameters, and return types.
- **`dist/graph/ast-graph.mermaid`**: Visual dependency diagram viewable in GitHub and Markdown previewers.
- **Graph-Augmented RAG**: When an AI agent queries a function, the engine injects immediate 1-hop connected types (parameter types, return types, inherited classes) directly into the answer.

### 3. Built for Maximum AI Context Efficiency & Quality
When coding with LLMs (Antigravity, Claude, ChatGPT, Cursor, Copilot), dumping entire files or whole source trees into prompt context wastes tokens, degrades reasoning quality, and causes hallucinations.
- This package includes pre-configured **AI Skills** (`skills/jsdoc-rag/SKILL.md` / `.agents/skills/jsdoc-rag/SKILL.md`) and **Rules** (`rules/jsdoc-rag-efficiency.md` / `.agents/rules/jsdoc-rag-efficiency.md`).
- AI assistants use `rag-sync query` and the AST graph to fetch only the exact ~30 tokens needed for a signature and its types—saving 95%+ of prompt tokens.

### 4. 100% Local & Offline Embeddings
Uses `@xenova/transformers` with `all-MiniLM-L6-v2` running directly inside Node.js via ONNX. Zero external API keys required, zero telemetry, instant offline startup.

---

## Installation in Your Project

Install as a development dependency:

### From GitHub:
```bash
npm install -D github:dlabz/jsdoc-dts-rag
```

### From Local Tarball (`.tgz`):
```bash
npm install -D ./dlabz-jsdoc-dts-rag-1.0.0.tgz
```

---

## Usage

### In `package.json` Scripts
Add the following commands to your project's `package.json`:
```json
{
  "scripts": {
    "rag:build": "rag-sync build -s src",
    "rag:watch": "rag-sync watch -s src",
    "rag:query": "rag-sync query",
    "rag:repl": "rag-sync repl"
  }
}
```

### CLI Commands

#### 1. Compile & Index (`build`)
```bash
npx rag-sync build --src src --types dist/types --docs dist/docs
```

#### 2. Start Live Watcher (`watch`)
Keeps `.d.ts`, Markdown docs, AST graph, and vector store synchronized on every save:
```bash
npx rag-sync watch --src src
```

#### 3. Query RAG Engine (`query`)
```bash
npx rag-sync query "How do I calculate distance between two coordinates?"
npx rag-sync query "authenticate user credentials"
```

#### 4. Interactive REPL Shell (`repl`)
```bash
npx rag-sync repl
```

---

## Programmatic API

You can also import and use the pipeline programmatically in Node.js:

```javascript
import { SyncPipeline, QueryEngine } from "@dlabz/jsdoc-dts-rag";

const pipeline = new SyncPipeline({
  srcDir: "./src",
  typesDir: "./dist/types",
  docsDir: "./dist/docs",
  graphDir: "./dist/graph"
});

await pipeline.init();
await pipeline.syncAll();

const engine = new QueryEngine(pipeline.store, pipeline.currentGraph);
const response = await engine.ask("How to create user?");
console.log(response.answer);
```

---

## License

MIT © [dlabz](https://github.com/dlabz)
