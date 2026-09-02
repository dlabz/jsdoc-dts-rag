import path from "node:path";
import { glob } from "glob";
import chalk from "chalk";
import { DtsGenerator } from "./compiler/dtsGenerator.js";
import { MarkdownGenerator } from "./compiler/markdownGenerator.js";
import { SemanticChunker } from "./rag/chunker.js";
import { VectorStore } from "./rag/vectorStore.js";
export class SyncPipeline {
    srcDir;
    typesDir;
    docsDir;
    dtsGen;
    mdGen;
    store;
    constructor(options = {}) {
        this.srcDir = path.resolve(options.srcDir || "src");
        this.typesDir = path.resolve(options.typesDir || "dist/types");
        this.docsDir = path.resolve(options.docsDir || "dist/docs");
        const cachePath = path.resolve(options.cacheDir || ".rag_cache", "vector_index.json");
        this.dtsGen = new DtsGenerator({
            rootDir: this.srcDir,
            outDir: this.typesDir,
        });
        this.mdGen = new MarkdownGenerator({
            rootDir: this.srcDir,
            outDir: this.docsDir,
        });
        this.store = new VectorStore(cachePath);
    }
    /**
     * Initializes the pipeline and vector store.
     */
    async init() {
        await this.store.init();
    }
    /**
     * Finds all JavaScript and TypeScript source files in the source directory.
     */
    async findSourceFiles() {
        const files = await glob("**/*.{js,jsx,ts,tsx}", {
            cwd: this.srcDir,
            ignore: ["**/*.d.ts", "**/node_modules/**", "**/dist/**"],
            absolute: true,
        });
        return files;
    }
    /**
     * Runs the full pipeline across all source files.
     */
    async syncAll() {
        const files = await this.findSourceFiles();
        if (files.length === 0) {
            console.log(chalk.yellow(`No source files found in ${this.srcDir}`));
            return { filesProcessed: 0, dtsCount: 0, mdCount: 0, totalChunks: 0 };
        }
        console.log(chalk.blue(`🔄 Synchronizing ${files.length} source files to .d.ts + Markdown + RAG...`));
        // 1. Compile to .d.ts
        const dtsResults = await this.dtsGen.compile(files);
        console.log(chalk.green(`  ✓ Generated ${dtsResults.length} .d.ts declaration files`));
        // 2. Generate Markdown
        const mdResults = await this.mdGen.generate(files);
        console.log(chalk.green(`  ✓ Generated ${mdResults.length} Markdown documentation files`));
        // 3. Chunk and index into VectorStore
        let totalChunks = 0;
        for (const sourceFile of files) {
            const dts = dtsResults.find((d) => d.sourcePath === sourceFile);
            const md = mdResults.find((m) => m.sourcePath === sourceFile);
            const allChunks = [];
            if (dts) {
                const dtsChunks = SemanticChunker.chunkDts(dts.dtsContent, sourceFile, dts.dtsPath);
                allChunks.push(...dtsChunks);
            }
            if (md) {
                const mdChunks = SemanticChunker.chunkMarkdown(md.markdownContent, sourceFile, md.markdownPath);
                allChunks.push(...mdChunks);
            }
            await this.store.upsertFileChunks(sourceFile, allChunks);
            totalChunks += allChunks.length;
        }
        const stats = this.store.stats();
        console.log(chalk.cyan(`  ✓ RAG Vector Store updated: ${stats.totalChunks} chunks across ${stats.filesIndexed} files (${stats.symbolsIndexed} unique symbols)`));
        return {
            filesProcessed: files.length,
            dtsCount: dtsResults.length,
            mdCount: mdResults.length,
            totalChunks,
        };
    }
    /**
     * Incrementally processes a single changed or added file.
     */
    async syncFile(filePath) {
        const resolvedPath = path.resolve(filePath);
        const start = Date.now();
        console.log(chalk.yellow(`\n⚡ Change detected in: ${path.relative(process.cwd(), resolvedPath)}`));
        // 1. Compile .d.ts
        const dtsResults = await this.dtsGen.compile([resolvedPath]);
        // 2. Generate Markdown
        const mdResults = await this.mdGen.generate([resolvedPath]);
        // 3. Chunk & Upsert
        const allChunks = [];
        if (dtsResults.length > 0) {
            const dts = dtsResults[0];
            allChunks.push(...SemanticChunker.chunkDts(dts.dtsContent, resolvedPath, dts.dtsPath));
        }
        if (mdResults.length > 0) {
            const md = mdResults[0];
            allChunks.push(...SemanticChunker.chunkMarkdown(md.markdownContent, resolvedPath, md.markdownPath));
        }
        await this.store.upsertFileChunks(resolvedPath, allChunks);
        const elapsed = Date.now() - start;
        console.log(chalk.green(`  ✓ Synced in ${elapsed}ms: emitted .d.ts, updated Markdown docs, and reindexed ${allChunks.length} RAG vector chunks`));
    }
    /**
     * Handles deletion of a source file.
     */
    async removeFile(filePath) {
        const resolvedPath = path.resolve(filePath);
        console.log(chalk.red(`\n🗑️  File deleted: ${path.relative(process.cwd(), resolvedPath)}`));
        const deletedCount = await this.store.removeFile(resolvedPath);
        console.log(chalk.gray(`  ✓ Removed ${deletedCount} chunks from RAG vector store`));
    }
}
