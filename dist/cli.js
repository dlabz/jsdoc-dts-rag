#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import readline from "node:readline";
import { SyncPipeline } from "./pipeline.js";
import { CodeWatcher } from "./watcher/index.js";
import { QueryEngine } from "./rag/queryEngine.js";
const program = new Command();
program
    .name("rag-sync")
    .description("JSDoc to .d.ts + Markdown compilation pipeline with live RAG vector store synchronization")
    .version("1.0.0");
program
    .command("build")
    .description("Compile all JSDoc source files into .d.ts, Markdown, and index into RAG vector store")
    .option("-s, --src <dir>", "Source directory containing JSDoc files", "examples")
    .option("-t, --types <dir>", "Output directory for .d.ts files", "dist/types")
    .option("-d, --docs <dir>", "Output directory for Markdown files", "dist/docs")
    .action(async (options) => {
    try {
        const pipeline = new SyncPipeline({
            srcDir: options.src,
            typesDir: options.types,
            docsDir: options.docs,
        });
        await pipeline.init();
        await pipeline.syncAll();
        console.log(chalk.green("\n🎉 Build and RAG synchronization complete!\n"));
    }
    catch (err) {
        console.error(chalk.red("Build failed:"), err);
        process.exit(1);
    }
});
program
    .command("watch")
    .description("Continuously watch source directory and keep .d.ts, Markdown, and RAG vector store in sync")
    .option("-s, --src <dir>", "Source directory containing JSDoc files", "examples")
    .option("-t, --types <dir>", "Output directory for .d.ts files", "dist/types")
    .option("-d, --docs <dir>", "Output directory for Markdown files", "dist/docs")
    .option("--debounce <ms>", "Debounce interval in milliseconds", "250")
    .action(async (options) => {
    try {
        const pipeline = new SyncPipeline({
            srcDir: options.src,
            typesDir: options.types,
            docsDir: options.docs,
        });
        await pipeline.init();
        const watcher = new CodeWatcher(pipeline, {
            srcDir: options.src,
            debounceMs: parseInt(options.debounce, 10),
        });
        await watcher.start();
        process.on("SIGINT", async () => {
            console.log(chalk.yellow("\nShutting down watcher..."));
            await watcher.close();
            process.exit(0);
        });
    }
    catch (err) {
        console.error(chalk.red("Watcher failed:"), err);
        process.exit(1);
    }
});
program
    .command("query <question>")
    .description("Query the RAG vector store for APIs, types, and documentation")
    .option("-k, --top-k <number>", "Number of retrieved results", "4")
    .action(async (question, options) => {
    try {
        const pipeline = new SyncPipeline();
        await pipeline.init();
        const engine = new QueryEngine(pipeline.store);
        await engine.loadGraph();
        console.log(chalk.blue(`\n🔍 Searching RAG store for: "${question}"...\n`));
        const response = await engine.ask(question, parseInt(options.topK, 10));
        console.log(response.answer);
        console.log(chalk.gray("\nSources cited:"));
        for (const s of response.sources) {
            console.log(chalk.gray(`  • [${s.artifactType}] ${s.symbol || "module"} in ${s.filePath} (similarity score: ${s.score})`));
        }
        console.log("");
    }
    catch (err) {
        console.error(chalk.red("Query failed:"), err);
        process.exit(1);
    }
});
program
    .command("repl")
    .description("Launch an interactive RAG terminal shell to ask questions continuously")
    .action(async () => {
    try {
        const pipeline = new SyncPipeline();
        await pipeline.init();
        const engine = new QueryEngine(pipeline.store);
        await engine.loadGraph();
        const stats = pipeline.store.stats();
        console.log(chalk.cyan("\n🤖 JSDoc RAG Interactive Shell"));
        console.log(chalk.gray(`   Indexed: ${stats.totalChunks} chunks, ${stats.symbolsIndexed} symbols across ${stats.filesIndexed} files`));
        console.log(chalk.gray("   Type your question (e.g. 'How to calculate distance?' or 'User auth') or 'exit' to quit.\n"));
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk.magenta("RAG> "),
        });
        rl.prompt();
        rl.on("line", async (line) => {
            const query = line.trim();
            if (query.toLowerCase() === "exit" || query.toLowerCase() === "quit") {
                rl.close();
                return;
            }
            if (query.length > 0) {
                console.log("");
                const response = await engine.ask(query, 3);
                console.log(response.answer);
                console.log("");
            }
            rl.prompt();
        });
        rl.on("close", () => {
            console.log(chalk.yellow("\nGoodbye!"));
            process.exit(0);
        });
    }
    catch (err) {
        console.error(chalk.red("REPL failed:"), err);
        process.exit(1);
    }
});
program.parse(process.argv);
