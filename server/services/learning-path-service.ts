import fs from "fs";
import path from "path";

// Types matching learning-path.json structure
export interface LearningPathTopic {
  id: string;
  title: string;
  description: string;
  subject: string;
  chapter: string;
  articleRefs: string[];
  xpReward: number;
}

export interface LearningPathUnit {
  id: string;
  title: string;
  weekRange: string;
  description: string;
  topics: LearningPathTopic[];
}

export interface LearningPathPhase {
  id: string;
  title: string;
  description: string;
  weekRange: string;
  sequenceNumber: number;
  units: LearningPathUnit[];
}

export interface LearningPath {
  version: string;
  title: string;
  description: string;
  phases: LearningPathPhase[];
}

export interface FlattenedNode {
  syllabusId: string | null;
  title: string;
  description: string | null;
  xpReward: number;
  orderIndex: number;
  parentNodeId: string | null;
  milestoneType: string;
  phaseId: string;
  unitId: string | null;
  weekRange: string;
  subject: string | null;
  chapter: string | null;
  articleRefs: string[];
  nodeType: string; // "phase-milestone" | "unit-milestone" | "topic"
  pathType: string; // always "pedagogical"
}

/**
 * Parses learning-path.json and flattens the Phase → Unit → Topic hierarchy
 * into a linear list of nodes suitable for insertion into roadmapNodes.
 */
export function parseLearningPath(): FlattenedNode[] | null {
  const learningPathFile = path.resolve(process.cwd(), "learning-path.json");

  if (!fs.existsSync(learningPathFile)) {
    console.warn("[LEARNING-PATH] learning-path.json not found. Skipping pedagogical path.");
    return null;
  }

  let data: LearningPath;
  try {
    data = JSON.parse(fs.readFileSync(learningPathFile, "utf-8"));
  } catch (err) {
    console.error("[LEARNING-PATH] Failed to parse learning-path.json:", err);
    return null;
  }

  if (!data.phases || !Array.isArray(data.phases)) {
    console.error("[LEARNING-PATH] Invalid structure: missing 'phases' array.");
    return null;
  }

  const nodes: FlattenedNode[] = [];
  // Use a high offset to avoid collision with syllabus-based orderIndex (0-500+)
  let orderIndex = 10000;

  for (const phase of data.phases) {
    // Phase milestone node
    nodes.push({
      syllabusId: null,
      title: `Faza ${phase.sequenceNumber}: ${phase.title}`,
      description: phase.description,
      xpReward: 0, // No reward for phase milestones
      orderIndex: orderIndex++,
      parentNodeId: null,
      milestoneType: "discipline",
      phaseId: phase.id,
      unitId: null,
      weekRange: phase.weekRange,
      subject: null,
      chapter: null,
      articleRefs: [],
      nodeType: "phase-milestone",
      pathType: "pedagogical",
    });

    for (const unit of phase.units) {
      // Unit milestone node
      nodes.push({
        syllabusId: null,
        title: unit.title,
        description: unit.description,
        xpReward: 0, // No reward for unit milestones
        orderIndex: orderIndex++,
        parentNodeId: null,
        milestoneType: "chapter",
        phaseId: phase.id,
        unitId: unit.id,
        weekRange: unit.weekRange,
        subject: null,
        chapter: null,
        articleRefs: [],
        nodeType: "unit-milestone",
        pathType: "pedagogical",
      });

      for (const topic of unit.topics) {
        // Topic node (actual learning content)
        nodes.push({
          syllabusId: topic.id, // Use topic ID as syllabusId for cross-referencing
          title: topic.title,
          description: topic.description,
          xpReward: topic.xpReward,
          orderIndex: orderIndex++,
          parentNodeId: null,
          milestoneType: "topic",
          phaseId: phase.id,
          unitId: unit.id,
          weekRange: unit.weekRange,
          subject: topic.subject,
          chapter: topic.chapter,
          articleRefs: topic.articleRefs,
          nodeType: "topic",
          pathType: "pedagogical",
        });
      }
    }
  }

  console.log(`[LEARNING-PATH] Parsed ${nodes.length} nodes from learning-path.json (${data.phases.length} phases)`);
  return nodes;
}

/**
 * Returns summary stats about the learning path.
 */
export function getLearningPathStats(nodes: FlattenedNode[]) {
  const phases = nodes.filter(n => n.nodeType === "phase-milestone").length;
  const units = nodes.filter(n => n.nodeType === "unit-milestone").length;
  const topics = nodes.filter(n => n.nodeType === "topic").length;
  const totalXp = nodes.reduce((sum, n) => sum + n.xpReward, 0);

  return { phases, units, topics, totalNodes: nodes.length, totalXp };
}
