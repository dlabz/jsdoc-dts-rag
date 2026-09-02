---
name: jsdoc-rag
description: Search, inspect, and navigate codebase APIs, TypeScript declarations (.d.ts), and AST symbol relationship graphs generated from JSDoc comments. Use for ultra-high AI context efficiency without loading raw source files.
---

# JSDoc RAG & AST Graph Query Skill

This skill enables AI agents to query codebase APIs, inspect type definitions, and traverse symbol relationship graphs with maximum context efficiency and zero token waste.

## When to Use

- When needing to look up function signatures, class methods, or typedefs in the codebase.
- When needing to know parameter types or return structures before writing or refactoring code.
- When understanding dependencies between types and functions via the AST relationship graph.
- When maintaining or generating JSDoc comments that compile to TypeScript declaration files (`.d.ts`).

## Core CLI Workflows

### 1. Semantic API & Type Retrieval
To find a type or function without reading entire files into context:
```bash
npx rag-sync query "<search query or symbol name>"
```
Example:
```bash
npx rag-sync query "calculate distance"
npx rag-sync query "authenticate user credentials"
```
The output provides:
- The exact TypeScript declaration signature (`.d.ts`).
- Markdown parameter table with types and descriptions.
- `@example` usage snippets.
- **AST Type Graph Relations**: 1-hop connected types (e.g. `param -> Point2D`, `returns -> AuthSession`).

### 2. Inspecting the Symbol AST Graph
The compilation pipeline continuously generates:
- `dist/graph/ast-graph.json`: Machine-readable node-link graph of all codebase symbols and type connections.
- `dist/graph/ast-graph.mermaid`: Visual dependency flowchart.

When resolving multi-symbol dependencies, read the specific node in `dist/graph/ast-graph.json` rather than reading raw source files.

### 3. Running the Live Watcher
During development, ensure the watcher is active so edits to JSDoc immediately update `.d.ts`, Markdown docs, and the RAG index:
```bash
npx rag-sync watch
```

## AI Context Efficiency Principles

1. **Query Before Viewing**: Never run `view_file` on a large source file just to find a function signature or parameter type. Use `npx rag-sync query "<symbol>"` instead.
2. **Follow Graph Edges**: If a function takes `Point2D`, query `Point2D` directly to get its fields.
3. **Preserve JSDoc Tags**: When generating or editing JavaScript code, always include `@param {Type} name`, `@returns {Type}`, and `@typedef` so declarations and AST edges remain complete and accurate.
