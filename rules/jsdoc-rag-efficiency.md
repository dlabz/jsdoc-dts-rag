# AI Context Efficiency & JSDoc RAG Rules

These rules ensure maximum AI context efficiency, token conservation, and high documentation quality across any project using the JSDoc to `.d.ts` + Markdown RAG pipeline.

## 1. Context Efficiency (Token Conservation)
- **Do Not Load Full Files for Signatures**: When you need to know how a function is called or what properties a type contains, **always** query the RAG index first:
  ```bash
  npx rag-sync query "<function or type name>"
  ```
- **Leverage AST Graph Relationships**: Use `dist/graph/ast-graph.json` to trace type relationships instead of searching multiple source files manually.
- **Minimal Context Injection**: Rely on the extracted `.d.ts` declarations in `dist/types/` for type validation rather than inspecting implementation details.

## 2. JSDoc Quality Guidelines
When creating or editing JavaScript or TypeScript code, adhere to these JSDoc patterns so the compiler pipeline can emit clean `.d.ts` files, Markdown docs, and AST graph edges:

- **File Overview**:
  ```javascript
  /**
   * @fileoverview Brief description of module purpose.
   * @module moduleName
   */
  ```

- **Type Definitions (`@typedef`)**:
  ```javascript
  /**
   * @typedef {Object} ConfigOptions
   * @property {string} host - Server hostname.
   * @property {number} [port=8080] - Optional connection port.
   */
  ```

- **Functions & Methods**:
  - Always specify `@param {Type} name - description`.
  - Always specify `@returns {Type} description`.
  - Include `@throws {ErrorType} condition` when applicable.
  - Include at least one `@example` block.
  - Mark legacy or deprecated functions with `@deprecated reason`.

## 3. Real-Time Synchronization
- Always ensure `npm run watch` (or `npx rag-sync watch`) is active during development so code changes are immediately reflected in `.d.ts`, Markdown docs, and the RAG index.
