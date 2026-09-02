import chalk from "chalk";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { VectorStore, SearchResult } from "./vectorStore.js";
import { AstGraphData } from "../compiler/astGraphGenerator.js";

export interface RagResponse {
  query: string;
  answer: string;
  results: SearchResult[];
  sources: {
    symbol?: string;
    filePath: string;
    artifactType: string;
    score: number;
  }[];
  graphNeighbors?: {
    symbol: string;
    relation: string;
    connectedSymbol: string;
  }[];
}

export class QueryEngine {
  private store: VectorStore;
  private graph: AstGraphData | null = null;

  constructor(store: VectorStore, graph?: AstGraphData | null) {
    this.store = store;
    if (graph) {
      this.graph = graph;
    }
  }

  public async loadGraph(graphPath = "dist/graph/ast-graph.json"): Promise<void> {
    const resolved = path.resolve(graphPath);
    if (existsSync(resolved)) {
      try {
        const raw = await fs.readFile(resolved, "utf-8");
        this.graph = JSON.parse(raw);
      } catch {}
    }
  }

  /**
   * Performs semantic retrieval and synthesizes an answer for the user's question.
   */
  public async ask(query: string, topK = 4): Promise<RagResponse> {
    const results = await this.store.search(query, topK);

    if (results.length === 0) {
      return {
        query,
        answer: "No relevant declarations or documentation found in the vector index.",
        results: [],
        sources: [],
      };
    }

    // Sources summary
    const sources = results.map((r) => ({
      symbol: r.chunk.symbolName,
      filePath: r.chunk.metadata.filePath,
      artifactType: r.chunk.artifactType,
      score: Number(r.chunk.artifactType ? r.score.toFixed(3) : r.score.toFixed(3)),
    }));

    const graphNeighbors: {
      symbol: string;
      relation: string;
      connectedSymbol: string;
    }[] = [];

    if (this.graph) {
      for (const r of results) {
        if (r.chunk.symbolName) {
          const sym = r.chunk.symbolName;
          const matchingEdges = this.graph.edges.filter(
            (e) => e.source.endsWith(`.${sym}`) || e.target.endsWith(`.${sym}`)
          );
          for (const edge of matchingEdges) {
            const isSource = edge.source.endsWith(`.${sym}`);
            graphNeighbors.push({
              symbol: sym,
              relation: edge.relation,
              connectedSymbol: isSource ? edge.target.split(".").pop()! : edge.source.split(".").pop()!,
            });
          }
        }
      }
    }

    // Synthesize response based on top retrieved contexts
    const answer = this.synthesizeAnswer(query, results, graphNeighbors);

    return {
      query,
      answer,
      results,
      sources,
      graphNeighbors,
    };
  }

  private synthesizeAnswer(
    query: string,
    results: SearchResult[],
    graphNeighbors: { symbol: string; relation: string; connectedSymbol: string }[]
  ): string {
    const parts: string[] = [];

    parts.push(`### Relevant API Matches for: "${query}"\n`);

    for (let i = 0; i < results.length; i++) {
      const { chunk, score } = results[i];
      const matchQuality =
        score > 0.8
          ? chalk.green(`[High Match: ${(score * 100).toFixed(1)}%]`)
          : score > 0.65
          ? chalk.cyan(`[Good Match: ${(score * 100).toFixed(1)}%]`)
          : chalk.yellow(`[Related: ${(score * 100).toFixed(1)}%]`);

      let contentBlock = chunk.content;

      // Append graph connection badges if available
      const related = graphNeighbors.filter((g) => g.symbol === chunk.symbolName);
      if (related.length > 0) {
        const links = Array.from(
          new Set(related.map((r) => `\`${r.relation}\` -> **${r.connectedSymbol}**`))
        ).join(", ");
        contentBlock += `\n\n*Type Graph Relations:* ${links}`;
      }

      parts.push(
        `#### ${i + 1}. ${chunk.title} ${matchQuality}\n` +
          `*Type:* \`${chunk.artifactType}\` | *Source:* \`${chunk.sourceFile}\`\n\n` +
          `${contentBlock}\n`
      );
    }

    return parts.join("\n---\n\n");
  }
}
