import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import {
  uploadDocument,
  getDocuments,
  processDocument,
  analyzeDocumentPatterns,
  deleteDocument,
  processDocumentChunks,
  getDocumentChunks,
  generateDocumentEmbeddings,
} from "../services/document.service";

const router = Router();

// POST /documents/upload - Upload document (base64)
router.post("/documents/upload", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const result = await uploadDocument(userId, req.body);
  res.json(result);
}));

// GET /documents - Get all uploaded documents
router.get("/documents", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const docs = await getDocuments(userId);
  res.json(docs);
}));

// POST /documents/process - Process uploaded document
router.post("/documents/process", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const result = await processDocument(userId, req.body);
  res.json(result);
}));

// POST /documents/analyze-patterns - Analyze exam patterns
router.post("/documents/analyze-patterns", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { documentIds, subject } = req.body;
  if (!documentIds || documentIds.length === 0) {
    throw new AppError(400, "No documents specified");
  }
  try {
    const analysis = await analyzeDocumentPatterns(userId, documentIds, subject);
    res.json(analysis);
  } catch (err: any) {
    if (err.message === "No exam documents found") throw new AppError(404, err.message);
    throw err;
  }
}));

// DELETE /documents/:id - Delete document
router.delete("/documents/:id", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  await deleteDocument(userId, req.params.id);
  res.json({ success: true });
}));

// POST /documents/:id/process-chunks - Process document into chunks
router.post("/documents/:id/process-chunks", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  try {
    const result = await processDocumentChunks(userId, req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err.message === "Document not found") throw new AppError(404, err.message);
    if (err.message === "Document has no extracted text") throw new AppError(400, err.message);
    throw err;
  }
}));

// GET /documents/:id/chunks - Get document chunks
router.get("/documents/:id/chunks", asyncHandler(async (req, res) => {
  const chunks = await getDocumentChunks(req.params.id);
  res.json(chunks);
}));

// POST /documents/:id/generate-embeddings - Generate embeddings for document chunks
router.post("/documents/:id/generate-embeddings", asyncHandler(async (req, res) => {
  try {
    const result = await generateDocumentEmbeddings(req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err.message === "No chunks found for this document") throw new AppError(404, err.message);
    throw err;
  }
}));

export default router;
