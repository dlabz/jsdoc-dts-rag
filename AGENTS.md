# AI Agent Guidelines for Projects using @dlabz/jsdoc-dts-rag

This repository uses `@dlabz/jsdoc-dts-rag` to automatically maintain TypeScript declarations (`.d.ts`), Markdown documentation, and a real-time vector RAG index directly from JSDoc comments.

## Available Agent Skills
- **Skill `jsdoc-rag`**: Located in `skills/jsdoc-rag/` or `.agents/skills/jsdoc-rag/`.
- Query syntax: `npx rag-sync query "<search query>"`
- Live sync: `npx rag-sync watch`

## Core Instructions for AI Assistants
1. **Never load large files into prompt context just to look up types or functions**. Use `npx rag-sync query "<symbol>"` to retrieve exact type declarations and documentation snippets.
2. **Consult the AST Graph**: Check `dist/graph/ast-graph.json` or `.mermaid` to understand how types relate before suggesting modifications.
3. **Always format code with standard JSDoc**: Whenever you create or modify JavaScript functions or classes, include `@param`, `@returns`, `@example`, and `@typedef` annotations so that `.d.ts` and Markdown files are cleanly compiled.
