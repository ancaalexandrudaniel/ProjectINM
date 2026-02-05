import { db } from "../db";
import { roadmapNodes, userNodeProgress, userGamification, syllabusTopicMappings, questions, legislativeActs } from "@shared/schema";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

export class RoadmapService {

  /**
   * Initializes the roadmap data if the table is empty.
   */
  static async initialize() {
    try {
      const countResult = await db.select({ count: sql<number>`count(*)` }).from(roadmapNodes);
      const count = Number(countResult[0]?.count || 0);

      if (count > 0) {
        console.log("[ROADMAP] Roadmap data already exists. Skipping initialization.");
        return;
      }

      console.log("[ROADMAP] Table empty. Seeding roadmap from syllabus.json...");

      // Determine path to syllabus.json
      // In production (bundled), process.cwd() is usually the app root
      const syllabusPath = path.resolve(process.cwd(), "syllabus.json");

      if (!fs.existsSync(syllabusPath)) {
        console.error(`[ROADMAP] FATAL: syllabus.json not found at ${syllabusPath}`);
        return;
      }

      const syllabusData = JSON.parse(fs.readFileSync(syllabusPath, "utf-8"));

      let orderIndex = 0;
      const nodesToInsert: any[] = [];

      function processNode(node: any, depth: number = 0) {
        let milestoneType = "topic";
        if (depth === 0) milestoneType = "discipline";
        else if (depth === 1) milestoneType = "chapter";
        else if (node.children && node.children.length > 0) milestoneType = "section";
        else milestoneType = "topic";

        let xpReward = 50;
        if (milestoneType === "chapter") xpReward = 500;
        if (milestoneType === "section") xpReward = 200;

        nodesToInsert.push({
          syllabusId: node.id,
          title: node.title,
          description: null,
          xpReward,
          orderIndex: orderIndex++,
          parentNodeId: null,
          milestoneType,
        });

        if (node.children) {
          for (const child of node.children) {
            processNode(child, depth + 1);
          }
        }
      }

      for (const disc of syllabusData) {
        processNode(disc);
      }

      // Batch insert
      const batchSize = 100;
      for (let i = 0; i < nodesToInsert.length; i += batchSize) {
        const batch = nodesToInsert.slice(i, i + batchSize);
        await db.insert(roadmapNodes).values(batch);
        console.log(`[ROADMAP] Inserted batch ${Math.floor(i / batchSize) + 1}`);
      }

      console.log("[ROADMAP] Initialization complete!");

    } catch (error) {
      console.error("[ROADMAP] Initialization failed:", error);
    }
  }

  /**
   * Retrieves the full roadmap for a user, including their progress status on each node.
   */
  static async getRoadmap(userId: string) {
    // 1. Fetch all nodes
    const nodes = await db.query.roadmapNodes.findMany({
      orderBy: [asc(roadmapNodes.orderIndex)],
    });

    // 2. Fetch user progress
    const progress = await db.query.userNodeProgress.findMany({
      where: eq(userNodeProgress.userId, userId),
    });

    const progressMap = new Map(progress.map(p => [p.nodeId, p]));

    // 3. Merge and determine status
    const roadmap = nodes.map((node, index) => {
      const userProgress = progressMap.get(node.id);
      let status = userProgress?.status || "LOCKED";

      if (status === "LOCKED") {
        if (index === 0) {
          status = "AVAILABLE";
        } else {
          const prevNode = nodes[index - 1];
          const prevProgress = progressMap.get(prevNode.id);
          if (prevProgress && (prevProgress.status === "COMPLETED" || prevProgress.status === "MASTERED")) {
            status = "AVAILABLE";
          }
        }
      }

      return {
        ...node,
        status,
        score: userProgress?.score || 0,
        completedAt: userProgress?.completedAt,
      };
    });

    // 4. Also fetch user gamification stats
    let userStats = await db.query.userGamification.findFirst({
      where: eq(userGamification.userId, userId),
    });

    if (!userStats) {
      // Initialize if not exists
      try {
        [userStats] = await db.insert(userGamification).values({ userId }).returning();
      } catch (e) {
        // Handle race condition
        userStats = await db.query.userGamification.findFirst({
            where: eq(userGamification.userId, userId),
        });
      }
    }

    return {
      nodes: roadmap,
      stats: userStats
    };
  }

  /**
   * Retrieves the content for a specific roadmap node (Theory, Context, etc.)
   */
  static async getNodeContent(nodeId: string) {
    const node = await db.query.roadmapNodes.findFirst({
      where: eq(roadmapNodes.id, nodeId),
    });

    if (!node) throw new Error("Node not found");

    let syllabusTopic = null;
    let relevantQuestions: any[] = [];

    if (node.syllabusId) {
      syllabusTopic = await db.query.syllabusTopicMappings.findFirst({
        where: eq(syllabusTopicMappings.syllabusId, node.syllabusId),
      });

      if (syllabusTopic) {
        relevantQuestions = await db.query.questions.findMany({
          where: eq(questions.chapter, syllabusTopic.topicTitle),
          limit: 5,
        });
      }
    }

    return {
      node,
      syllabusTopic,
      relevantQuestions,
    };
  }

  /**
   * Marks a node as complete, calculates XP, and unlocks the next node.
   */
  static async completeNode(userId: string, nodeId: string, performance: { score: number }) {
    const node = await db.query.roadmapNodes.findFirst({
      where: eq(roadmapNodes.id, nodeId),
    });

    if (!node) throw new Error("Node not found");

    const status = performance.score >= 90 ? "MASTERED" : "COMPLETED";

    const existingProgress = await db.query.userNodeProgress.findFirst({
      where: and(eq(userNodeProgress.userId, userId), eq(userNodeProgress.nodeId, nodeId)),
    });

    let xpGained = 0;

    if (!existingProgress || existingProgress.status === "LOCKED" || existingProgress.status === "AVAILABLE") {
      xpGained = node.xpReward || 100;
      if (performance.score === 100) xpGained += 50;

      await db.insert(userNodeProgress).values({
        userId,
        nodeId,
        status,
        score: performance.score,
        completedAt: new Date(),
      }).onConflictDoUpdate({
        target: [userNodeProgress.userId, userNodeProgress.nodeId],
        set: {
            status,
            score: sql`GREATEST(user_node_progress.score, ${performance.score})`,
            completedAt: new Date(),
        }
      });

      await db.update(userGamification)
        .set({
            currentXp: sql`current_xp + ${xpGained}`,
        })
        .where(eq(userGamification.userId, userId));

    } else {
         await db.update(userNodeProgress)
            .set({
                status: (existingProgress.status === "MASTERED") ? "MASTERED" : status,
                score: sql`GREATEST(user_node_progress.score, ${performance.score})`
            })
            .where(and(eq(userNodeProgress.userId, userId), eq(userNodeProgress.nodeId, nodeId)));
    }

    return {
      success: true,
      xpGained,
      status,
      nodeId
    };
  }
}
