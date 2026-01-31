import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import {
    createComment,
    deleteComment,
    getCommentsByReel,
} from "../controllers/commentController.js";

const router = Router();

// POST /comments - Create a new comment (requires auth)
router.post("/", verifyToken, createComment);

// DELETE /comments/:commentId - Delete a comment (requires auth)
router.delete("/:commentId", verifyToken, deleteComment);

// GET /comments/reel/:reelId - Get all comments for a reel (public)
router.get("/reel/:reelId", getCommentsByReel);

export default router;
