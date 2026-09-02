import { SyncPipeline } from "../pipeline.js";
export interface WatcherOptions {
    srcDir?: string;
    debounceMs?: number;
}
export declare class CodeWatcher {
    private pipeline;
    private srcDir;
    private debounceMs;
    private watcher;
    private changeTimers;
    constructor(pipeline: SyncPipeline, options?: WatcherOptions);
    /**
     * Starts watching for file changes.
     */
    start(): Promise<void>;
    private scheduleSync;
    private handleUnlink;
    /**
     * Stops the file watcher.
     */
    close(): Promise<void>;
}
