import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { DocumentChunk } from "./chunker.js";
import { EmbeddingService } from "./embeddings.js";

export interface VectorRecord extends DocumentChunk {
  embedding: number[];
  indexedAt: number;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export class VectorStore {
  private records: Map<string, VectorRecord> = new Map();
  private cachePath: string;

  constructor(cachePath = ".rag_cache/vector_index.json") {
    this.cachePath = path.resolve(cachePath);
  }

  /**
   * Initializes store by loading existing persisted index if available.
   */
  public async init(): Promise<void> {
    if (existsSync(this.cachePath)) {
      try {
        const raw = await fs.readFile(this.cachePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            this.records.set(item.id, item);
          }
        }
      } catch (err) {
        console.error("Warning: Failed to load existing vector cache, reinitializing empty store.", err);
      }
    }
  }

  /**
   * Upserts chunks for a given source file. Removes previous chunks from the same file.
   */
  public async upsertFileChunks(
    sourceFile: string,
    chunks: DocumentChunk[],
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    // 1. Remove old chunks for this file
    this.removeFile(sourceFile, false);

    // 2. Compute embeddings and add new chunks
    let count = 0;
    for (const chunk of chunks) {
      const textToEmbed = `${chunk.title}\n${chunk.symbolName ? `Symbol: ${chunk.symbolName}\n` : ""}${chunk.content}`;
      const embedding = await EmbeddingService.embed(textToEmbed);
      const record: VectorRecord = {
        ...chunk,
        embedding,
        indexedAt: Date.now(),
      };
      this.records.set(record.id, record);
      count++;
      if (onProgress) {
        onProgress(count, chunks.length);
      }
    }

    // 3. Persist to disk
    await this.persist();
  }

  /**
   * Removes all indexed chunks belonging to a specific source file.
   */
  public async removeFile(sourceFile: string, persist = true): Promise<number> {
    const toDelete: string[] = [];
    for (const [id, record] of this.records.entries()) {
      if (record.sourceFile === sourceFile) {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      this.records.delete(id);
    }
    if (persist && toDelete.length > 0) {
      await this.persist();
    }
    return toDelete.length;
  }

  /**
   * Searches the vector store using hybrid dense cosine similarity + symbol match boosting.
   */
  public async search(
    query: string,
    topK = 5,
    options?: { artifactType?: "dts" | "markdown" }
  ): Promise<SearchResult[]> {
    const queryEmbedding = await EmbeddingService.embed(query);
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\W+/).filter((w) => w.length > 2);

    const scored: SearchResult[] = [];

    for (const record of this.records.values()) {
      if (options?.artifactType && record.artifactType !== options.artifactType) {
        continue;
      }

      // Dense cosine similarity
      const vectorScore = EmbeddingService.cosineSimilarity(
        queryEmbedding,
        record.embedding
      );

      // Symbol / keyword lexical bonus for hybrid retrieval
      let lexicalBonus = 0;
      if (record.symbolName) {
        const symbolLower = record.symbolName.toLowerCase();
        if (queryLower.includes(symbolLower)) {
          lexicalBonus += 0.15; // Strong boost if exact symbol name appears in query
        }
      }

      // Small bonus if title words match
      const titleLower = record.title.toLowerCase();
      for (const word of queryWords) {
        if (titleLower.includes(word)) {
          lexicalBonus += 0.03;
        }
      }

      const totalScore = vectorScore + Math.min(lexicalBonus, 0.25);

      scored.push({
        chunk: record,
        score: totalScore,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /**
   * Returns vector store summary statistics.
   */
  public stats(): { totalChunks: number; filesIndexed: number; symbolsIndexed: number } {
    const files = new Set<string>();
    const symbols = new Set<string>();
    for (const record of this.records.values()) {
      files.add(record.sourceFile);
      if (record.symbolName) {
        symbols.add(record.symbolName);
      }
    }
    return {
      totalChunks: this.records.size,
      filesIndexed: files.size,
      symbolsIndexed: symbols.size,
    };
  }

  /**
   * Persists vector store records to JSON cache.
   */
  public async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
    const recordsArray = Array.from(this.records.values());
    await fs.writeFile(
      this.cachePath,
      JSON.stringify(recordsArray, null, 2),
      "utf-8"
    );
  }
}
