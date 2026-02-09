import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import { RoadmapService } from "../services/roadmap-service";

const router = Router();

// GET /roadmap - Get the user's roadmap state
router.get("/roadmap", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const roadmap = await RoadmapService.getRoadmap(userId);
  res.json(roadmap);
}));

// GET /roadmap/node/:nodeId - Get content for a specific node
router.get("/roadmap/node/:nodeId", asyncHandler(async (req, res) => {
  const { nodeId } = req.params;
  const content = await RoadmapService.getNodeContent(nodeId);
  res.json(content);
}));

// POST /roadmap/node/:nodeId/complete - Mark a node as completed
router.post("/roadmap/node/:nodeId/complete", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { nodeId } = req.params;
  const { score } = req.body;

  if (score === undefined) {
    throw new AppError(400, "Score is required");
  }

  const result = await RoadmapService.completeNode(userId, nodeId, { score });
  res.json(result);
}));

export default router;
