const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// Import models
const Reel = require("../models/Reel");
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify admin access via JWT
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      error: "Access denied", 
      message: "No token provided" 
    });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ 
        error: "Access denied", 
        message: "Admin privileges required" 
      });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: "Access denied", 
      message: "Invalid or expired token" 
    });
  }
};

// Apply verifyAdmin middleware to all admin routes
router.use(verifyAdmin);

// POST - Upload a new Video (Reel)
router.post("/video", async (req, res) => {
  try {
    const { adminId, videoData } = req.body;

    const newVideo = new Reel({
      video: {
        url: videoData?.video?.url,
        thumbnail: videoData?.video?.thumbnail || "",
        durationSec: videoData?.video?.durationSec || 0
      },
      content: {
        title: videoData?.content?.title || "",
        description: videoData?.content?.description || "",
        tags: videoData?.content?.tags || [],
        difficulty: videoData?.content?.difficulty || "beginner"
      },
      gameId: videoData?.gameId || null,
      status: videoData?.status || "draft"
    });

    const savedVideo = await newVideo.save();
    res.status(201).json({ 
      success: true, 
      data: savedVideo,
      uploadedBy: adminId 
    });
    console.log(`Video uploaded by admin ${adminId}:`, savedVideo._id);
  } catch (err) {
    console.error("Upload video error:", err);
    res.status(500).json({ error: "Failed to upload video", message: err.message });
  }
});

// PUT - Update an existing Video
router.put("/video/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const { updatedData } = req.body;

    const updatedVideo = await Reel.findByIdAndUpdate(
      videoId,
      {
        $set: {
          "video.url": updatedData?.video?.url,
          "video.thumbnail": updatedData?.video?.thumbnail,
          "video.durationSec": updatedData?.video?.durationSec,
          "content.title": updatedData?.content?.title,
          "content.description": updatedData?.content?.description,
          "content.tags": updatedData?.content?.tags,
          "content.difficulty": updatedData?.content?.difficulty,
          gameId: updatedData?.gameId,
          status: updatedData?.status
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedVideo) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json({ success: true, data: updatedVideo });
    console.log("Video updated:", videoId);
  } catch (err) {
    console.error("Update video error:", err);
    res.status(500).json({ error: "Failed to update video", message: err.message });
  }
});

// DELETE - Delete a Video
router.delete("/video/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    const deletedVideo = await Reel.findByIdAndDelete(videoId);

    if (!deletedVideo) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json({ success: true, message: "Video deleted successfully", data: deletedVideo });
    console.log("Video deleted:", videoId);
  } catch (err) {
    console.error("Delete video error:", err);
    res.status(500).json({ error: "Failed to delete video", message: err.message });
  }
});

// GET - Get all Videos
router.get("/videos", async (req, res) => {
  try {
    const videos = await Reel.find()
      .populate("gameId")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: videos.length, data: videos });
    console.log("All videos fetched:", videos.length);
  } catch (err) {
    console.error("Get all videos error:", err);
    res.status(500).json({ error: "Failed to fetch videos", message: err.message });
  }
});

// GET - Get Video by ID
router.get("/video/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    const video = await Reel.findById(videoId).populate("gameId");

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json({ success: true, data: video });
    console.log("Video fetched:", videoId);
  } catch (err) {
    console.error("Get video by ID error:", err);
    res.status(500).json({ error: "Failed to fetch video", message: err.message });
  }
});

module.exports = router;
