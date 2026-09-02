# AI Agent Guidelines & Coding Standards

This repository uses `@dlabz/jsdoc-dts-rag` to automatically maintain TypeScript declarations (`.d.ts`), Markdown documentation, and a real-time vector RAG index directly from JSDoc comments.

---

## 1. Zero-Compilation Vanilla JS & Cross-Runtime Rules
- **No Build Steps for Runtime**: All user code must run natively without transpilation or build tools (no Babel, no TypeScript compile step to JS).
- **Mandatory `// @ts-check`**: Every `.js` file **must** begin with `// @ts-check` on line 1 so editors and TypeScript language services enforce strict type checking directly from JSDoc.
- **Cross-Runtime Portability (Browser, Deno, Node)**:
  - Use native ECMAScript Modules (ESM) with explicit `.js` extensions in all relative imports:
    ```javascript
    import { correlateWaves } from './src/wavePropagation.js';
    ```
  - Use only web-standard APIs (`fetch`, `crypto`, `performance`, `Float32Array`, standard `Math`, etc.) that execute natively in modern Browsers, DenoJS, and modern Node.
  - Never import platform-locked APIs (e.g. Node-only `fs`, `path`, or native binary bindings) in runtime code.
- **Verification**: Run `npm run check` (`tsc --noEmit`) to validate type correctness across all files without generating any output files.

---

## 2. Extensive JSDoc & Markdown Documentation
- **File Overview**: Every module must declare `@fileoverview` and `@module`.
- **Type Safety via `@typedef`**: Define complex structures with `@typedef` and `@property`.
- **Function Annotations**: Every exported or internal function must specify:
  - `@param {Type} name - description`
  - `@returns {Type} description`
  - `@throws {ErrorType} condition`
  - `@example` code block demonstrating real-world usage
- **Markdown Docs Generation**: The `@dlabz/jsdoc-dts-rag` pipeline automatically builds structured Markdown docs with parameter tables and examples in `dist/docs/` (`npm run docs`).

---

## 3. Token Conservation & AI RAG Retrieval
- **Never load large files into prompt context just to look up types or functions**.
- Use the **`jsdoc-rag` skill** or CLI:
  ```bash
  npx rag-sync query "<search query or symbol name>"
  # or
  npm run rag:query -- "<search query or symbol name>"
  ```
- **Consult the AST Graph**: Read `dist/graph/ast-graph.json` or `.mermaid` to understand symbol connections and dependencies before editing.
- Keep `npm run rag:watch` active during development to synchronize `.d.ts`, Markdown docs, and vector index.
