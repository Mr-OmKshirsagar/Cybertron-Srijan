import { Router } from "express";
import uploadMemory from "../middleware/uploadMemory.js";
import { analyzeDocument, getDocumentSession } from "../controllers/analyzeController.js";

const router = Router();

// Ingest, extract intelligence, store vectors, schedule tasks
router.post("/analyze", uploadMemory.single("file"), analyzeDocument);

// Fetch session data
router.get("/:sessionId", getDocumentSession);

export default router;
