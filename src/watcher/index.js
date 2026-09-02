import chokidar from "chokidar";
import path from "node:path";
import chalk from "chalk";
export class CodeWatcher {
    pipeline;
    srcDir;
    debounceMs;
    watcher = null;
    changeTimers = new Map();
    constructor(pipeline, options = {}) {
        this.pipeline = pipeline;
        this.srcDir = path.resolve(options.srcDir || "src");
        this.debounceMs = options.debounceMs || 250;
    }
    /**
     * Starts watching for file changes.
     */
    async start() {
        console.log(chalk.cyan(`\n👀 Starting watcher on: ${this.srcDir}`));
        console.log(chalk.gray(`   Watching for .js, .jsx, .ts, .tsx file changes...`));
        // Initial full sync first
        await this.pipeline.syncAll();
        this.watcher = chokidar.watch(this.srcDir, {
            ignored: [
                /(^|[\/\\])\../, // ignore dotfiles
                "**/node_modules/**",
                "**/*.d.ts",
                "**/dist/**",
                "**/.rag_cache/**",
            ],
            persistent: true,
            ignoreInitial: true, // initial sync handled explicitly above
            awaitWriteFinish: {
                stabilityThreshold: 150,
                pollInterval: 50,
            },
        });
        this.watcher
            .on("add", (filePath) => this.scheduleSync(filePath))
            .on("change", (filePath) => this.scheduleSync(filePath))
            .on("unlink", (filePath) => this.handleUnlink(filePath))
            .on("error", (error) => console.error(chalk.red("Watcher error:"), error));
        console.log(chalk.green(`\n🚀 Watcher active. Listening for live edits... (Press Ctrl+C to exit)\n`));
    }
    scheduleSync(filePath) {
        const ext = path.extname(filePath);
        if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
            return;
        }
        const existingTimer = this.changeTimers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        const timer = setTimeout(async () => {
            this.changeTimers.delete(filePath);
            try {
                await this.pipeline.syncFile(filePath);
            }
            catch (err) {
                console.error(chalk.red(`Error syncing ${filePath}:`), err);
            }
        }, this.debounceMs);
        this.changeTimers.set(filePath, timer);
    }
    async handleUnlink(filePath) {
        try {
            await this.pipeline.removeFile(filePath);
        }
        catch (err) {
            console.error(chalk.red(`Error handling file removal ${filePath}:`), err);
        }
    }
    /**
     * Stops the file watcher.
     */
    async close() {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }
        for (const timer of this.changeTimers.values()) {
            clearTimeout(timer);
        }
        this.changeTimers.clear();
    }
}
