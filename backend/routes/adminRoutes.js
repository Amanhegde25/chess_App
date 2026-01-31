import { Router } from "express";
import { verifyAdmin } from "../middleware/auth.js";
import {
    uploadVideo,
    updateVideo,
    deleteVideo,
    getAllVideos,
    getVideoById,
} from "../controllers/adminController.js";

const router = Router();

// Apply verifyAdmin middleware to all admin routes
router.use(verifyAdmin);

// POST /admin/video - Upload a new Video
router.post("/video", uploadVideo);

// PUT /admin/video/:videoId - Update an existing Video
router.put("/video/:videoId", updateVideo);

// DELETE /admin/video/:videoId - Delete a Video
router.delete("/video/:videoId", deleteVideo);

// GET /admin/videos - Get all Videos
router.get("/videos", getAllVideos);

// GET /admin/video/:videoId - Get Video by ID
router.get("/video/:videoId", getVideoById);

export default router;
