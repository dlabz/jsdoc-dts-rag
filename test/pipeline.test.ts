import assert from "node:assert";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { SyncPipeline } from "../src/pipeline.js";
import { QueryEngine } from "../src/rag/queryEngine.js";

async function runTests() {
  console.log("🧪 Starting Pipeline & RAG Verification Tests...\n");

  const pipeline = new SyncPipeline({
    srcDir: "examples",
    typesDir: "dist/types",
    docsDir: "dist/docs",
    cacheDir: ".rag_cache",
  });

  await pipeline.init();

  // Test 1: Full Sync Compilation
  console.log("▶ Test 1: Running full pipeline sync...");
  const syncResult = await pipeline.syncAll();

  assert(syncResult.filesProcessed >= 2, "Should process at least 2 example files");
  assert(syncResult.dtsCount >= 2, "Should generate at least 2 .d.ts files");
  assert(syncResult.mdCount >= 2, "Should generate at least 2 markdown files");
  assert(syncResult.totalChunks > 0, "Should generate RAG chunks");

  // Verify file existence
  const mathDts = path.resolve("dist/types/mathUtils.d.ts");
  const userDts = path.resolve("dist/types/userService.d.ts");
  const mathMd = path.resolve("dist/docs/mathUtils.md");
  const userMd = path.resolve("dist/docs/userService.md");

  assert(existsSync(mathDts), "mathUtils.d.ts must exist");
  assert(existsSync(userDts), "userService.d.ts must exist");
  assert(existsSync(mathMd), "mathUtils.md must exist");
  assert(existsSync(userMd), "userService.md must exist");

  const mathDtsContent = await fs.readFile(mathDts, "utf-8");
  assert(
    mathDtsContent.includes("calculateDistance"),
    "mathUtils.d.ts should declare calculateDistance"
  );
  assert(
    mathDtsContent.includes("Point2D"),
    "mathUtils.d.ts should include Point2D type"
  );

  const mathMdContent = await fs.readFile(mathMd, "utf-8");
  assert(
    mathMdContent.includes("### `calculateDistance`"),
    "mathUtils.md should contain calculateDistance section"
  );
  assert(
    mathMdContent.includes("Euclidean distance"),
    "mathUtils.md should contain description"
  );
  assert(
    mathMdContent.includes("#### Parameters"),
    "mathUtils.md should contain parameter table"
  );

  // Verify AST Graph generation
  const graphJsonPath = path.resolve("dist/graph/ast-graph.json");
  const graphMermaidPath = path.resolve("dist/graph/ast-graph.mermaid");
  assert(existsSync(graphJsonPath), "ast-graph.json must exist");
  assert(existsSync(graphMermaidPath), "ast-graph.mermaid must exist");

  const graphJsonRaw = await fs.readFile(graphJsonPath, "utf-8");
  const graphJson = JSON.parse(graphJsonRaw);
  assert(graphJson.nodes.length > 0, "AST graph must contain nodes");
  assert(graphJson.edges.length > 0, "AST graph must contain edges");

  console.log(`  ✓ Verified AST Graph: ${graphJson.nodes.length} nodes, ${graphJson.edges.length} edges`);
  console.log("  ✅ Full compilation, markdown & AST graph generation passed!\n");

  // Test 2: RAG Vector Store & Semantic Querying
  console.log("▶ Test 2: Testing RAG Query Engine retrieval...");
  const engine = new QueryEngine(pipeline.store, pipeline.currentGraph);

  // Query 1: Geometry / distance
  const q1 = "How do I calculate distance between two coordinates?";
  console.log(`  Querying: "${q1}"`);
  const res1 = await engine.ask(q1, 3);
  assert(res1.results.length > 0, "Should retrieve matches for distance query");
  const topMatch1 = res1.results[0];
  console.log(`    Top Match: ${topMatch1.chunk.title} (Score: ${topMatch1.score.toFixed(3)})`);
  assert(
    topMatch1.chunk.title.includes("calculateDistance") ||
      topMatch1.chunk.title.includes("manhattanDistance") ||
      topMatch1.chunk.content.includes("calculateDistance"),
    "Top result should relate to distance"
  );

  // Query 2: Authentication
  const q2 = "How to authenticate user with credentials?";
  console.log(`  Querying: "${q2}"`);
  const res2 = await engine.ask(q2, 3);
  assert(res2.results.length > 0, "Should retrieve matches for auth query");
  const topMatch2 = res2.results[0];
  console.log(`    Top Match: ${topMatch2.chunk.title} (Score: ${topMatch2.score.toFixed(3)})`);
  assert(
    topMatch2.chunk.title.includes("UserService") ||
      topMatch2.chunk.title.includes("authenticate") ||
      topMatch2.chunk.content.includes("authenticate"),
    "Top result should relate to authentication"
  );

  // Query 3: Matrix
  const q3 = "determinant of a matrix";
  console.log(`  Querying: "${q3}"`);
  const res3 = await engine.ask(q3, 3);
  assert(res3.results.length > 0, "Should retrieve matches for matrix determinant");
  const topMatch3 = res3.results[0];
  console.log(`    Top Match: ${topMatch3.chunk.title} (Score: ${topMatch3.score.toFixed(3)})`);
  assert(
    topMatch3.chunk.title.includes("Matrix") ||
      topMatch3.chunk.content.includes("determinant"),
    "Top result should relate to Matrix"
  );

  console.log("  ✅ RAG retrieval tests passed!\n");

  // Test 3: Incremental Sync
  console.log("▶ Test 3: Testing incremental file sync...");
  const tempFile = path.resolve("examples/tempModule.js");
  await fs.writeFile(
    tempFile,
    `/**
 * @fileoverview Temporary test module.
 * @module tempModule
 */

/**
 * Greets a user by their given name.
 * @param {string} name - Name to greet.
 * @returns {string} The greeting message.
 */
export function greet(name) {
  return "Hello " + name;
}
`,
    "utf-8"
  );

  await pipeline.syncFile(tempFile);

  const greetRes = await engine.ask("greet a user by name", 1);
  assert(greetRes.results.length > 0, "Should find greet function in RAG store");
  console.log(`    Incremental query result: ${greetRes.results[0].chunk.title}`);
  assert(
    greetRes.results[0].chunk.title.includes("greet") ||
      greetRes.results[0].chunk.content.includes("greet"),
    "Should find greet function"
  );

  // Test removal
  await fs.unlink(tempFile);
  await pipeline.removeFile(tempFile);
  const statsAfterRemoval = pipeline.store.stats();
  console.log(`    Store stats after file removal: ${statsAfterRemoval.totalChunks} chunks`);

  console.log("  ✅ Incremental sync test passed!\n");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
