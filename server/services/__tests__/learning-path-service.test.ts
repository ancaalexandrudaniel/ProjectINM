import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseLearningPath, getLearningPathStats, type FlattenedNode } from "../learning-path-service";
import fs from "fs";
import path from "path";

describe("learning-path-service", () => {
  describe("parseLearningPath", () => {
    it("should parse learning-path.json and return flattened nodes", () => {
      const nodes = parseLearningPath();

      expect(nodes).not.toBeNull();
      expect(nodes!.length).toBeGreaterThan(0);

      // All nodes should have pathType "pedagogical"
      for (const node of nodes!) {
        expect(node.pathType).toBe("pedagogical");
      }
    });

    it("should create phase-milestone, unit-milestone, and topic nodes", () => {
      const nodes = parseLearningPath()!;

      const phaseMilestones = nodes.filter(n => n.nodeType === "phase-milestone");
      const unitMilestones = nodes.filter(n => n.nodeType === "unit-milestone");
      const topics = nodes.filter(n => n.nodeType === "topic");

      expect(phaseMilestones.length).toBe(6); // Phase 0-5
      expect(unitMilestones.length).toBeGreaterThan(0);
      expect(topics.length).toBeGreaterThan(0);

      // Total should be sum of all three types
      expect(nodes.length).toBe(phaseMilestones.length + unitMilestones.length + topics.length);
    });

    it("should assign incrementing orderIndex starting at 10000", () => {
      const nodes = parseLearningPath()!;

      expect(nodes[0].orderIndex).toBe(10000);

      for (let i = 1; i < nodes.length; i++) {
        expect(nodes[i].orderIndex).toBe(nodes[i - 1].orderIndex + 1);
      }
    });

    it("should set phaseId on all nodes", () => {
      const nodes = parseLearningPath()!;

      for (const node of nodes) {
        expect(node.phaseId).toBeTruthy();
        expect(node.phaseId).toMatch(/^phase-\d+$/);
      }
    });

    it("should set subject and chapter only on topic nodes", () => {
      const nodes = parseLearningPath()!;

      const topics = nodes.filter(n => n.nodeType === "topic");
      const milestones = nodes.filter(n => n.nodeType !== "topic");

      // Topics should have subject
      for (const topic of topics) {
        expect(topic.subject).toBeTruthy();
        expect(topic.chapter).toBeTruthy();
      }

      // Milestones should NOT have subject
      for (const milestone of milestones) {
        expect(milestone.subject).toBeNull();
      }
    });

    it("should give 0 XP to milestone nodes", () => {
      const nodes = parseLearningPath()!;

      const milestones = nodes.filter(n => n.nodeType !== "topic");
      for (const m of milestones) {
        expect(m.xpReward).toBe(0);
      }
    });

    it("should give positive XP to topic nodes", () => {
      const nodes = parseLearningPath()!;

      const topics = nodes.filter(n => n.nodeType === "topic");
      for (const t of topics) {
        expect(t.xpReward).toBeGreaterThan(0);
      }
    });

    it("should maintain correct phase ordering", () => {
      const nodes = parseLearningPath()!;

      const phases = nodes.filter(n => n.nodeType === "phase-milestone");

      for (let i = 1; i < phases.length; i++) {
        expect(phases[i].orderIndex).toBeGreaterThan(phases[i - 1].orderIndex);
      }
    });
  });

  describe("getLearningPathStats", () => {
    it("should return correct summary stats", () => {
      const nodes = parseLearningPath()!;
      const stats = getLearningPathStats(nodes);

      expect(stats.phases).toBe(6);
      expect(stats.units).toBeGreaterThan(0);
      expect(stats.topics).toBeGreaterThan(0);
      expect(stats.totalNodes).toBe(nodes.length);
      expect(stats.totalXp).toBeGreaterThan(0);
    });
  });
});
