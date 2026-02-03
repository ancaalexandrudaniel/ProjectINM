
import "dotenv/config";
import { db } from "../server/db";
import { roadmapNodes, syllabusTopicMappings } from "../shared/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Initializing Roadmap...");

  // 1. Read syllabus.json
  const syllabusPath = path.resolve(__dirname, "../syllabus.json");
  const syllabusData = JSON.parse(fs.readFileSync(syllabusPath, "utf-8"));

  console.log("Syllabus loaded. Flattening...");

  let orderIndex = 0;
  const nodesToInsert: any[] = [];

  function processNode(node: any, parentId: string | null = null, depth: number = 0) {
    // Only add to roadmap if it has children or is a leaf.
    // Actually, "Game Levels" should probably be the substantial topics.
    // Let's include everything for now, but maybe flag 'milestone_type'.

    // Determine type
    let milestoneType = "topic";
    if (depth === 0) milestoneType = "discipline";
    else if (depth === 1) milestoneType = "chapter";
    else if (node.children && node.children.length > 0) milestoneType = "section";
    else milestoneType = "topic";

    // Set XP based on depth/type
    let xpReward = 50;
    if (milestoneType === "chapter") xpReward = 500;
    if (milestoneType === "section") xpReward = 200;

    // Create node object
    const roadmapNode = {
      syllabusId: node.id,
      title: node.title,
      description: null, // Could generate or extract
      xpReward,
      orderIndex: orderIndex++,
      parentNodeId: null, // Will need to resolve if we want DB FK, but schema uses varchar
      milestoneType,
      // parentId from recursion is syllabus ID, not DB ID.
      // Mapping parentId requires inserting parents first or doing a second pass.
      // For visual linear map, orderIndex is key.
    };

    nodesToInsert.push(roadmapNode);

    if (node.children) {
      for (const child of node.children) {
        processNode(child, node.id, depth + 1);
      }
    }
  }

  for (const disc of syllabusData) {
    processNode(disc);
  }

  console.log(`Prepared ${nodesToInsert.length} nodes. Clearing old roadmap...`);

  await db.delete(roadmapNodes);

  console.log("Inserting new nodes...");

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < nodesToInsert.length; i += batchSize) {
    const batch = nodesToInsert.slice(i, i + batchSize);
    await db.insert(roadmapNodes).values(batch);
    console.log(`Inserted batch ${i / batchSize + 1}`);
  }

  console.log("Roadmap initialization complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
