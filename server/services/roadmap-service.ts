import { db } from "../db";
import { roadmapNodes, userNodeProgress, userGamification, syllabusTopicMappings, questions, legislativeActs } from "@shared/schema";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { checkBadges } from "./badge-definitions";

// Level thresholds: index = level, value = XP needed to reach that level
const LEVEL_THRESHOLDS = [0, 0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];

function computeLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 1;
}

function getNextLevelXp(level: number): number {
  return level < LEVEL_THRESHOLDS.length - 1 ? LEVEL_THRESHOLDS[level + 1] : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

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

      const processNode = (node: any, depth: number = 0) => {
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
      };

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
   * Marks a node as complete, calculates XP, updates level/streak/badges.
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

    // ========== LEVEL-UP ==========
    const gamification = await db.query.userGamification.findFirst({
      where: eq(userGamification.userId, userId),
    });

    let leveledUp = false;
    let newLevel = gamification?.currentLevel || 1;
    const currentXp = gamification?.currentXp || 0;

    const computedLevel = computeLevel(currentXp);
    if (computedLevel > newLevel) {
      newLevel = computedLevel;
      leveledUp = true;
      await db.update(userGamification)
        .set({ currentLevel: newLevel })
        .where(eq(userGamification.userId, userId));
    }

    // ========== STREAK ==========
    let streakUpdated = false;
    let currentStreak = gamification?.currentStreak || 0;

    if (gamification) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastActivity = gamification.lastActivityDate ? new Date(gamification.lastActivityDate) : null;
      if (lastActivity) lastActivity.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (!lastActivity || lastActivity.getTime() < today.getTime()) {
        // Not yet active today
        if (lastActivity && lastActivity.getTime() === yesterday.getTime()) {
          // Yesterday -> increment streak
          currentStreak = (gamification.currentStreak || 0) + 1;
        } else if (!lastActivity || lastActivity.getTime() < yesterday.getTime()) {
          // Older -> reset streak
          currentStreak = 1;
        }

        const longestStreak = Math.max(gamification.longestStreak || 0, currentStreak);

        await db.update(userGamification)
          .set({
            currentStreak,
            longestStreak,
            lastActivityDate: new Date(),
          })
          .where(eq(userGamification.userId, userId));

        streakUpdated = true;
      }
    }

    // ========== BADGES ==========
    // Count completed and mastered nodes
    const allProgress = await db.query.userNodeProgress.findMany({
      where: eq(userNodeProgress.userId, userId),
    });
    const completedNodes = allProgress.filter(
      (p) => p.status === "COMPLETED" || p.status === "MASTERED"
    ).length;
    const masteredNodes = allProgress.filter(
      (p) => p.status === "MASTERED"
    ).length;

    const alreadyUnlocked = (gamification?.unlockedBadges as string[]) || [];
    const newBadges = checkBadges({
      currentXp,
      currentStreak,
      completedNodes,
      masteredNodes,
      isPerfectScore: performance.score === 100,
      alreadyUnlocked,
    });

    if (newBadges.length > 0) {
      const updatedBadges = [...alreadyUnlocked, ...newBadges];
      await db.update(userGamification)
        .set({ unlockedBadges: updatedBadges })
        .where(eq(userGamification.userId, userId));
    }

    return {
      success: true,
      xpGained,
      status,
      nodeId,
      leveledUp,
      newLevel,
      nextLevelXp: getNextLevelXp(newLevel),
      currentXp,
      streakUpdated,
      currentStreak,
      newBadges,
    };
  }
}
