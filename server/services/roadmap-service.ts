import { db } from "../db";
import { roadmapNodes, userNodeProgress, userGamification, syllabusTopicMappings, questions, legislativeActs } from "@shared/schema";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";

export class RoadmapService {

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
    // Logic: If no progress, status is LOCKED unless it's the first node or prev is completed.

    const roadmap = nodes.map((node, index) => {
      const userProgress = progressMap.get(node.id);
      let status = userProgress?.status || "LOCKED";

      // If no explicit status, check if it should be unlocked
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
      [userStats] = await db.insert(userGamification).values({ userId }).returning();
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
    let articles: any[] = [];
    let relevantQuestions: any[] = [];

    if (node.syllabusId) {
      syllabusTopic = await db.query.syllabusTopicMappings.findFirst({
        where: eq(syllabusTopicMappings.syllabusId, node.syllabusId),
      });

      if (syllabusTopic) {
        // Fetch relevant questions (limit 5 for preview)
        // We match via chapter/topic logic. This is simplified for now.
        // Assuming syllabusTopic.topicTitle maps to question.chapter or topic
        // In a real scenario, we'd use the `chapterPatterns` or `articleRefs` for better matching.

        relevantQuestions = await db.query.questions.findMany({
          where: eq(questions.chapter, syllabusTopic.topicTitle),
          limit: 5,
        });

        // Fetch articles if `articleRefs` exists
        // This is tricky because `articleRefs` is a JSON array of strings like "Art. 1", "Art. 1-5"
        // And `legislativeActs` has `fullText`.
        // We might need to look up `legalArticles` table if it was populated.
        // For now, let's just return the metadata so the frontend can display references.
      }
    }

    return {
      node,
      syllabusTopic,
      relevantQuestions,
      // In the future, we can add actual article content fetching here
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

    // 1. Update or Insert Progress
    const status = performance.score >= 90 ? "MASTERED" : "COMPLETED";

    // Check if already completed to avoid double XP
    const existingProgress = await db.query.userNodeProgress.findFirst({
      where: and(eq(userNodeProgress.userId, userId), eq(userNodeProgress.nodeId, nodeId)),
    });

    let xpGained = 0;

    if (!existingProgress || existingProgress.status === "LOCKED" || existingProgress.status === "AVAILABLE") {
      // First time completion
      xpGained = node.xpReward || 100;

      // Add bonus for perfect score
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
            status, // Update status (e.g. AVAILABLE -> COMPLETED)
            score: sql`GREATEST(user_node_progress.score, ${performance.score})`,
            completedAt: new Date(),
        }
      });

      // Update User XP
      await db.update(userGamification)
        .set({
            currentXp: sql`current_xp + ${xpGained}`,
            currentLevel: sql`current_level + 0` // Placeholder for level up logic
        })
        .where(eq(userGamification.userId, userId));

    } else {
        // Just update score if better
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
