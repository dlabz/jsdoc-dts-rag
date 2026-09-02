# AI Coding Style: Zero-Compilation Vanilla JS, JSDoc Type-Checking & RAG Efficiency

These rules ensure maximum AI context efficiency, strict type correctness without compilation, and cross-platform compatibility across Browsers, DenoJS, and Node.js.

## 1. Zero-Compilation Vanilla JS & Cross-Runtime Compatibility
- **Native ESM Only**: Write standard ES2022+ modules. Code must execute directly without any transpiler (no Babel, SWC, or tsc emitting JS).
- **Mandatory `// @ts-check`**: The very first line of every `.js` file must be `// @ts-check`.
- **Browser & DenoJS Ready**:
  - Always include explicit `.js` extensions on relative imports:
    ```javascript
    import { correlateWaves } from './src/wavePropagation.js';
    ```
  - Rely exclusively on web-standard APIs (e.g. `crypto`, `performance`, `Float32Array`, `fetch`, standard `Math`).
  - Do not introduce Node-specific globals (`process`, `Buffer`, `__dirname`) or platform-specific modules in core runtime files.
- **Type Checking**: Validate types using `npm run check` (`tsc --noEmit`).

## 2. Extensive JSDoc & Markdown Documentation
Every module, class, interface, and function must include rich JSDoc:
- **Module Header**:
  ```javascript
  // @ts-check

  /**
   * @fileoverview Module description and domain concepts.
   * @module moduleName
   */
  ```
- **Type Definitions (`@typedef`)**:
  ```javascript
  /**
   * @typedef {Object} SignalConfig
   * @property {string} channelId - Channel identifier.
   * @property {number} sampleRate - Sampling frequency in Hz.
   * @property {Float32Array} buffer - Raw audio/wave samples.
   */
  ```
- **Function Contracts**:
  - Specify all `@param {Type} name - description`.
  - Specify `@returns {Type} description`.
  - Document all errors using `@throws {ErrorType} condition`.
  - Include at least one practical `@example`.
- **Markdown Documentation**: Generated via `npm run docs` into `dist/docs/*.md` with parameter tables, signatures, and examples.

## 3. Context Efficiency & JSDoc RAG Retrieval
- **Never load large source files into prompt context just to look up types or functions**.
- Use the RAG query engine:
  ```bash
  npx rag-sync query "<search query or symbol name>"
  ```
- **Consult the AST Graph**: Use `dist/graph/ast-graph.json` to inspect symbol dependencies and 1-hop relationships.
- **Real-Time Sync**: Keep `npm run rag:watch` running during active development so all `.d.ts`, Markdown, and embeddings stay updated automatically.
