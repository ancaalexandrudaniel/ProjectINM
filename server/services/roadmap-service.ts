import { db } from "../db";
import { roadmapNodes, userNodeProgress, userGamification, syllabusTopicMappings, questions } from "@shared/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { checkBadges } from "./badge-definitions";
import { parseLearningPath, getLearningPathStats } from "./learning-path-service";

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
   * Initializes both syllabus-based and pedagogical roadmap data.
   * Idempotent — skips each type if already present.
   */
  static async initialize() {
    try {
      // Check existing data
      const countResult = await db.select({ count: sql<number>`count(*)` }).from(roadmapNodes);
      const totalCount = Number(countResult[0]?.count || 0);

      // Check if pedagogical nodes exist
      const pedCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(roadmapNodes)
        .where(eq(roadmapNodes.pathType, "pedagogical"));
      const pedCount = Number(pedCountResult[0]?.count || 0);

      // ===== SYLLABUS-BASED NODES (legacy) =====
      if (totalCount === 0 || (totalCount > 0 && pedCount === totalCount)) {
        // No syllabus nodes exist — seed them
        await RoadmapService.initializeSyllabus();
      } else {
        console.log("[ROADMAP] Syllabus nodes already exist. Skipping.");
      }

      // ===== PEDAGOGICAL NODES (new) =====
      if (pedCount > 0) {
        console.log(`[ROADMAP] Pedagogical path already initialized (${pedCount} nodes). Skipping.`);
      } else {
        await RoadmapService.initializePedagogicalPath();
      }

    } catch (error) {
      console.error("[ROADMAP] Initialization failed:", error);
    }
  }

  /**
   * Seeds roadmap from syllabus.json (legacy behavior).
   */
  private static async initializeSyllabus() {
    console.log("[ROADMAP] Seeding roadmap from syllabus.json...");

    const syllabusPath = path.resolve(process.cwd(), "syllabus.json");
    if (!fs.existsSync(syllabusPath)) {
      console.error(`[ROADMAP] syllabus.json not found at ${syllabusPath}`);
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
        pathType: "syllabus",
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
      console.log(`[ROADMAP] Syllabus batch ${Math.floor(i / batchSize) + 1} inserted`);
    }

    console.log(`[ROADMAP] Syllabus initialization complete (${nodesToInsert.length} nodes).`);
  }

  /**
   * Seeds roadmap from learning-path.json (pedagogical path).
   */
  private static async initializePedagogicalPath() {
    const nodes = parseLearningPath();
    if (!nodes) {
      console.log("[ROADMAP] No pedagogical path data available.");
      return;
    }

    const stats = getLearningPathStats(nodes);
    console.log(`[ROADMAP] Inserting pedagogical path: ${stats.phases} phases, ${stats.units} units, ${stats.topics} topics (${stats.totalNodes} nodes total, ${stats.totalXp} total XP)`);

    // Batch insert
    const batchSize = 100;
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      await db.insert(roadmapNodes).values(batch);
      console.log(`[ROADMAP] Pedagogical batch ${Math.floor(i / batchSize) + 1} inserted`);
    }

    console.log("[ROADMAP] Pedagogical path initialization complete!");
  }

  /**
   * Retrieves the roadmap for a user.
   * Default: returns pedagogical path. Pass pathType="syllabus" for legacy view.
   */
  static async getRoadmap(userId: string, pathType: string = "pedagogical") {
    // 1. Fetch nodes filtered by path type
    const allNodes = await db.query.roadmapNodes.findMany({
      orderBy: [asc(roadmapNodes.orderIndex)],
    });

    const nodes = allNodes.filter(n => {
      if (pathType === "pedagogical") return n.pathType === "pedagogical";
      if (pathType === "syllabus") return n.pathType === "syllabus" || !n.pathType;
      return true; // "all"
    });

    // 2. Fetch user progress
    const progress = await db.query.userNodeProgress.findMany({
      where: eq(userNodeProgress.userId, userId),
    });

    const progressMap = new Map(progress.map(p => [p.nodeId, p]));

    // 3. Determine status with phase-aware unlocking
    const roadmap = pathType === "pedagogical"
      ? RoadmapService.computePedagogicalStatus(nodes, progressMap)
      : RoadmapService.computeLinearStatus(nodes, progressMap);

    // 4. Fetch user gamification stats
    let userStats = await db.query.userGamification.findFirst({
      where: eq(userGamification.userId, userId),
    });

    if (!userStats) {
      try {
        [userStats] = await db.insert(userGamification).values({ userId }).returning();
      } catch (e) {
        userStats = await db.query.userGamification.findFirst({
          where: eq(userGamification.userId, userId),
        });
      }
    }

    return { nodes: roadmap, stats: userStats };
  }

  /**
   * Phase-aware unlocking for pedagogical path:
   * - Phase milestones: available if previous phase is complete (or first phase)
   * - Unit milestones: available if their phase is available
   * - Topics: all topics in current phase are AVAILABLE simultaneously (flexible within phase)
   */
  private static computePedagogicalStatus(
    nodes: any[],
    progressMap: Map<string, any>
  ) {
    // Group topics by phase
    const phaseTopics = new Map<string, any[]>();
    for (const node of nodes) {
      if (node.nodeType === "topic" && node.phaseId) {
        if (!phaseTopics.has(node.phaseId)) phaseTopics.set(node.phaseId, []);
        phaseTopics.get(node.phaseId)!.push(node);
      }
    }

    // Determine which phases are complete (all topics COMPLETED or MASTERED)
    const phaseComplete = new Map<string, boolean>();
    for (const [phaseId, topics] of phaseTopics) {
      const allDone = topics.every(t => {
        const p = progressMap.get(t.id);
        return p && (p.status === "COMPLETED" || p.status === "MASTERED");
      });
      phaseComplete.set(phaseId, allDone);
    }

    // Extract ordered phase IDs
    const phaseOrder = nodes
      .filter(n => n.nodeType === "phase-milestone")
      .map(n => n.phaseId as string);

    // Determine which phases are available
    const phaseAvailable = new Map<string, boolean>();
    for (let i = 0; i < phaseOrder.length; i++) {
      if (i === 0) {
        phaseAvailable.set(phaseOrder[i], true);
      } else {
        const prevPhaseId = phaseOrder[i - 1];
        phaseAvailable.set(phaseOrder[i], phaseComplete.get(prevPhaseId) === true);
      }
    }

    return nodes.map(node => {
      const userProgress = progressMap.get(node.id);
      let status = userProgress?.status || "LOCKED";

      if (status === "LOCKED") {
        const phaseId = node.phaseId as string;

        if (node.nodeType === "phase-milestone") {
          // Phase milestone: available if it's the first or previous phase is complete
          if (phaseAvailable.get(phaseId)) {
            status = "AVAILABLE";
          }
          // Auto-complete phase milestone if all its topics are done
          if (phaseComplete.get(phaseId)) {
            status = "COMPLETED";
          }
        } else if (node.nodeType === "unit-milestone") {
          // Unit milestone: available when its phase is available
          if (phaseAvailable.get(phaseId)) {
            status = "AVAILABLE";
          }
        } else if (node.nodeType === "topic") {
          // Topics: all topics in an available phase are AVAILABLE
          if (phaseAvailable.get(phaseId)) {
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
  }

  /**
   * Legacy linear unlocking (for syllabus-based roadmap).
   */
  private static computeLinearStatus(
    nodes: any[],
    progressMap: Map<string, any>
  ) {
    return nodes.map((node, index) => {
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
  }

  /**
   * Retrieves content for a specific roadmap node.
   * Enhanced: uses subject + chapter for pedagogical nodes.
   */
  static async getNodeContent(nodeId: string) {
    const node = await db.query.roadmapNodes.findFirst({
      where: eq(roadmapNodes.id, nodeId),
    });

    if (!node) throw new Error("Node not found");

    let syllabusTopic = null;
    let relevantQuestions: any[] = [];

    // For pedagogical nodes: use subject + chapter to find questions
    if (node.pathType === "pedagogical" && node.subject && node.chapter) {
      relevantQuestions = await db.query.questions.findMany({
        where: and(
          eq(questions.subject, node.subject),
          eq(questions.chapter, node.chapter)
        ),
        limit: 10,
      });
    }
    // For syllabus nodes: use syllabusId (legacy behavior)
    else if (node.syllabusId) {
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
   * Works identically for both pedagogical and syllabus nodes.
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
        if (lastActivity && lastActivity.getTime() === yesterday.getTime()) {
          currentStreak = (gamification.currentStreak || 0) + 1;
        } else if (!lastActivity || lastActivity.getTime() < yesterday.getTime()) {
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
