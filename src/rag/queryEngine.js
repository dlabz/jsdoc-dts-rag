import chalk from "chalk";
export class QueryEngine {
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * Performs semantic retrieval and synthesizes an answer for the user's question.
     */
    async ask(query, topK = 4) {
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
        // Synthesize response based on top retrieved contexts
        const answer = this.synthesizeAnswer(query, results);
        return {
            query,
            answer,
            results,
            sources,
        };
    }
    synthesizeAnswer(query, results) {
        const parts = [];
        parts.push(`### Relevant API Matches for: "${query}"\n`);
        for (let i = 0; i < results.length; i++) {
            const { chunk, score } = results[i];
            const matchQuality = score > 0.8
                ? chalk.green(`[High Match: ${(score * 100).toFixed(1)}%]`)
                : score > 0.65
                    ? chalk.cyan(`[Good Match: ${(score * 100).toFixed(1)}%]`)
                    : chalk.yellow(`[Related: ${(score * 100).toFixed(1)}%]`);
            parts.push(`#### ${i + 1}. ${chunk.title} ${matchQuality}\n` +
                `*Type:* \`${chunk.artifactType}\` | *Source:* \`${chunk.sourceFile}\`\n\n` +
                `${chunk.content}\n`);
        }
        return parts.join("\n---\n\n");
    }
}
