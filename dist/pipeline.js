import path from "node:path";
import { glob } from "glob";
import chalk from "chalk";
import { DtsGenerator } from "./compiler/dtsGenerator.js";
import { MarkdownGenerator } from "./compiler/markdownGenerator.js";
import { SemanticChunker } from "./rag/chunker.js";
import { VectorStore } from "./rag/vectorStore.js";
import { AstGraphGenerator } from "./compiler/astGraphGenerator.js";
export class SyncPipeline {
    srcDir;
    typesDir;
    docsDir;
    graphDir;
    dtsGen;
    mdGen;
    astGraphGen;
    store;
    currentGraph = null;
    constructor(options = {}) {
        this.srcDir = path.resolve(options.srcDir || "src");
        this.typesDir = path.resolve(options.typesDir || "dist/types");
        this.docsDir = path.resolve(options.docsDir || "dist/docs");
        this.graphDir = path.resolve(options.graphDir || "dist/graph");
        const cachePath = path.resolve(options.cacheDir || ".rag_cache", "vector_index.json");
        this.dtsGen = new DtsGenerator({
            rootDir: this.srcDir,
            outDir: this.typesDir,
        });
        this.mdGen = new MarkdownGenerator({
            rootDir: this.srcDir,
            outDir: this.docsDir,
        });
        this.astGraphGen = new AstGraphGenerator({
            outDir: this.graphDir,
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
        // 3. Generate AST Graph from emitted .d.ts files
        const allDtsFiles = dtsResults.map((d) => d.dtsPath);
        this.currentGraph = await this.astGraphGen.generateFromDts(allDtsFiles);
        console.log(chalk.magenta(`  ✓ Generated .d.ts AST Graph: ${this.currentGraph.nodes.length} nodes, ${this.currentGraph.edges.length} relationships`));
        // 4. Chunk and index into VectorStore
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
            // Add AST Graph contextual chunk for this file
            if (this.currentGraph) {
                const fileBase = path.basename(sourceFile, path.extname(sourceFile));
                const relatedEdges = this.currentGraph.edges.filter((e) => e.source.startsWith(fileBase) || e.target.startsWith(fileBase));
                if (relatedEdges.length > 0) {
                    const edgeSummary = relatedEdges
                        .map((e) => `- \`${e.source}\` ${e.relation} \`${e.target}\``)
                        .join("\n");
                    allChunks.push({
                        id: `graph-${fileBase}`,
                        sourceFile,
                        artifactType: "dts",
                        title: `Type Dependency AST Graph for ${fileBase}`,
                        content: `### AST Dependency & Type Relationship Graph for ${fileBase}\n\n${edgeSummary}\n`,
                        metadata: {
                            filePath: path.join(this.graphDir, "ast-graph.json"),
                            kind: "AstGraph",
                        },
                    });
                }
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
        // 3. Update AST Graph from all current .d.ts files
        const allDts = await glob("**/*.d.ts", { cwd: this.typesDir, absolute: true });
        if (allDts.length > 0) {
            this.currentGraph = await this.astGraphGen.generateFromDts(allDts);
        }
        // 4. Chunk & Upsert
        const allChunks = [];
        if (dtsResults.length > 0) {
            const dts = dtsResults[0];
            allChunks.push(...SemanticChunker.chunkDts(dts.dtsContent, resolvedPath, dts.dtsPath));
        }
        if (mdResults.length > 0) {
            const md = mdResults[0];
            allChunks.push(...SemanticChunker.chunkMarkdown(md.markdownContent, resolvedPath, md.markdownPath));
        }
        if (this.currentGraph) {
            const fileBase = path.basename(resolvedPath, path.extname(resolvedPath));
            const relatedEdges = this.currentGraph.edges.filter((e) => e.source.startsWith(fileBase) || e.target.startsWith(fileBase));
            if (relatedEdges.length > 0) {
                const edgeSummary = relatedEdges
                    .map((e) => `- \`${e.source}\` ${e.relation} \`${e.target}\``)
                    .join("\n");
                allChunks.push({
                    id: `graph-${fileBase}`,
                    sourceFile: resolvedPath,
                    artifactType: "dts",
                    title: `Type Dependency AST Graph for ${fileBase}`,
                    content: `### AST Dependency & Type Relationship Graph for ${fileBase}\n\n${edgeSummary}\n`,
                    metadata: {
                        filePath: path.join(this.graphDir, "ast-graph.json"),
                        kind: "AstGraph",
                    },
                });
            }
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
