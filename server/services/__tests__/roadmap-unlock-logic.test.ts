import { describe, it, expect } from "vitest";

/**
 * Tests for the phase-aware unlocking logic.
 * These test the pure computation functions extracted from RoadmapService.
 * Since computePedagogicalStatus is a private method, we test the logic directly.
 */

type MockNode = {
  id: string;
  phaseId: string;
  nodeType: string;
  status?: string;
};

type MockProgress = {
  nodeId: string;
  status: string;
  score: number;
};

// Replicate the unlock logic from roadmap-service.ts for unit testing
function computePedagogicalStatus(
  nodes: MockNode[],
  progressMap: Map<string, MockProgress>
) {
  // Group topics by phase
  const phaseTopics = new Map<string, MockNode[]>();
  for (const node of nodes) {
    if (node.nodeType === "topic" && node.phaseId) {
      if (!phaseTopics.has(node.phaseId)) phaseTopics.set(node.phaseId, []);
      phaseTopics.get(node.phaseId)!.push(node);
    }
  }

  // Determine which phases are complete
  const phaseComplete = new Map<string, boolean>();
  for (const [phaseId, topics] of phaseTopics) {
    const allDone = topics.every(t => {
      const p = progressMap.get(t.id);
      return p && (p.status === "COMPLETED" || p.status === "MASTERED");
    });
    phaseComplete.set(phaseId, allDone);
  }

  // Phase ordering
  const phaseOrder = nodes
    .filter(n => n.nodeType === "phase-milestone")
    .map(n => n.phaseId);

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
      const phaseId = node.phaseId;

      if (node.nodeType === "phase-milestone") {
        if (phaseAvailable.get(phaseId)) status = "AVAILABLE";
        if (phaseComplete.get(phaseId)) status = "COMPLETED";
      } else if (node.nodeType === "unit-milestone") {
        if (phaseAvailable.get(phaseId)) status = "AVAILABLE";
      } else if (node.nodeType === "topic") {
        if (phaseAvailable.get(phaseId)) status = "AVAILABLE";
      }
    }

    return { ...node, status, score: userProgress?.score || 0 };
  });
}

describe("Phase-aware unlocking logic", () => {
  const mockNodes: MockNode[] = [
    // Phase 0
    { id: "p0", phaseId: "phase-0", nodeType: "phase-milestone" },
    { id: "u0-1", phaseId: "phase-0", nodeType: "unit-milestone" },
    { id: "t0-1", phaseId: "phase-0", nodeType: "topic" },
    { id: "t0-2", phaseId: "phase-0", nodeType: "topic" },
    // Phase 1
    { id: "p1", phaseId: "phase-1", nodeType: "phase-milestone" },
    { id: "u1-1", phaseId: "phase-1", nodeType: "unit-milestone" },
    { id: "t1-1", phaseId: "phase-1", nodeType: "topic" },
    { id: "t1-2", phaseId: "phase-1", nodeType: "topic" },
    // Phase 2
    { id: "p2", phaseId: "phase-2", nodeType: "phase-milestone" },
    { id: "u2-1", phaseId: "phase-2", nodeType: "unit-milestone" },
    { id: "t2-1", phaseId: "phase-2", nodeType: "topic" },
  ];

  it("should make Phase 0 available for a new user (no progress)", () => {
    const result = computePedagogicalStatus(mockNodes, new Map());

    // Phase 0 should be available
    expect(result.find(n => n.id === "p0")!.status).toBe("AVAILABLE");
    expect(result.find(n => n.id === "u0-1")!.status).toBe("AVAILABLE");
    expect(result.find(n => n.id === "t0-1")!.status).toBe("AVAILABLE");
    expect(result.find(n => n.id === "t0-2")!.status).toBe("AVAILABLE");

    // Phase 1 should be locked
    expect(result.find(n => n.id === "p1")!.status).toBe("LOCKED");
    expect(result.find(n => n.id === "t1-1")!.status).toBe("LOCKED");

    // Phase 2 should be locked
    expect(result.find(n => n.id === "p2")!.status).toBe("LOCKED");
  });

  it("should unlock all topics within an available phase (flexibility)", () => {
    const result = computePedagogicalStatus(mockNodes, new Map());

    // Both topics in Phase 0 should be AVAILABLE (not just the first one)
    expect(result.find(n => n.id === "t0-1")!.status).toBe("AVAILABLE");
    expect(result.find(n => n.id === "t0-2")!.status).toBe("AVAILABLE");
  });

  it("should unlock Phase 1 when all Phase 0 topics are completed", () => {
    const progress = new Map<string, MockProgress>();
    progress.set("t0-1", { nodeId: "t0-1", status: "COMPLETED", score: 80 });
    progress.set("t0-2", { nodeId: "t0-2", status: "MASTERED", score: 95 });

    const result = computePedagogicalStatus(mockNodes, progress);

    // Phase 0 milestone should be auto-completed
    expect(result.find(n => n.id === "p0")!.status).toBe("COMPLETED");

    // Phase 1 should now be available
    expect(result.find(n => n.id === "p1")!.status).toBe("AVAILABLE");
    expect(result.find(n => n.id === "t1-1")!.status).toBe("AVAILABLE");
    expect(result.find(n => n.id === "t1-2")!.status).toBe("AVAILABLE");

    // Phase 2 should still be locked
    expect(result.find(n => n.id === "p2")!.status).toBe("LOCKED");
  });

  it("should NOT unlock Phase 1 if only some Phase 0 topics are completed", () => {
    const progress = new Map<string, MockProgress>();
    progress.set("t0-1", { nodeId: "t0-1", status: "COMPLETED", score: 80 });
    // t0-2 NOT completed

    const result = computePedagogicalStatus(mockNodes, progress);

    // Phase 1 should remain locked
    expect(result.find(n => n.id === "p1")!.status).toBe("LOCKED");
    expect(result.find(n => n.id === "t1-1")!.status).toBe("LOCKED");
  });

  it("should keep completed/mastered status from user progress", () => {
    const progress = new Map<string, MockProgress>();
    progress.set("t0-1", { nodeId: "t0-1", status: "MASTERED", score: 100 });

    const result = computePedagogicalStatus(mockNodes, progress);

    expect(result.find(n => n.id === "t0-1")!.status).toBe("MASTERED");
    expect(result.find(n => n.id === "t0-1")!.score).toBe(100);
  });

  it("should unlock Phase 2 when Phase 0 and Phase 1 are both complete", () => {
    const progress = new Map<string, MockProgress>();
    // Complete all of Phase 0
    progress.set("t0-1", { nodeId: "t0-1", status: "COMPLETED", score: 85 });
    progress.set("t0-2", { nodeId: "t0-2", status: "COMPLETED", score: 75 });
    // Complete all of Phase 1
    progress.set("t1-1", { nodeId: "t1-1", status: "MASTERED", score: 92 });
    progress.set("t1-2", { nodeId: "t1-2", status: "COMPLETED", score: 70 });

    const result = computePedagogicalStatus(mockNodes, progress);

    // Phase 2 should be available
    expect(result.find(n => n.id === "p2")!.status).toBe("AVAILABLE");
    expect(result.find(n => n.id === "t2-1")!.status).toBe("AVAILABLE");
  });
});
