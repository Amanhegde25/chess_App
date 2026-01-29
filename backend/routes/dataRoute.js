const express = require("express");
const router = express.Router();

// Import models
const User = require("../models/User");
const ChessGame = require("../models/ChessGame");
const Reel = require("../models/Reel");
const Comment = require("../models/Comment");

// GET all data from DB
router.get("/all", async (req, res) => {
  try {
    const [
      users,
      chessGames,
      reels,
      comments,
    ] = await Promise.all([
      User.find(),
      ChessGame.find(),
      Reel.find()
        .populate("createdBy", "username")
        .populate("gameId"),
      Comment.find()
        .populate("userId", "username")
        .populate("reelId"),
    ]);

    res.json({
      users,
      chessGames,
      reels,
      comments,
    });
    console.log("Data route accessed: all data sent");
  } catch (err) {
    console.error("Data route error:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// POST - Create a new User
router.post("/user", async (req, res) => {
  try {
    const { username, email, profile } = req.body;
    
    const newUser = new User({
      username,
      email,
      profile: {
        name: profile?.name || "",
        avatarUrl: profile?.avatarUrl || "",
        bio: profile?.bio || "",
        chessRating: profile?.chessRating || 800
      }
    });
    
    const savedUser = await newUser.save();
    res.status(201).json({ success: true, data: savedUser });
    console.log("User created:", savedUser.username);
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user", message: err.message });
  }
});

// POST - Create a new ChessGame
router.post("/chessgame", async (req, res) => {
  try {
    const { whitePlayer, blackPlayer, event, year, result, pgn } = req.body;
    
    const newGame = new ChessGame({
      whitePlayer,
      blackPlayer,
      event,
      year,
      result,
      pgn
    });
    
    const savedGame = await newGame.save();
    res.status(201).json({ success: true, data: savedGame });
    console.log("Chess game created:", savedGame._id);
  } catch (err) {
    console.error("Create chess game error:", err);
    res.status(500).json({ error: "Failed to create chess game", message: err.message });
  }
});

// POST - Create a new Reel
router.post("/reel", async (req, res) => {
  try {
    const { createdBy, video, content, gameId, status } = req.body;
    
    const newReel = new Reel({
      createdBy,
      video: {
        url: video?.url,
        thumbnail: video?.thumbnail || "",
        durationSec: video?.durationSec || 0
      },
      content: {
        title: content?.title || "",
        description: content?.description || "",
        tags: content?.tags || [],
        difficulty: content?.difficulty || "beginner"
      },
      gameId,
      status: status || "draft"
    });
    
    const savedReel = await newReel.save();
    res.status(201).json({ success: true, data: savedReel });
    console.log("Reel created:", savedReel._id);
  } catch (err) {
    console.error("Create reel error:", err);
    res.status(500).json({ error: "Failed to create reel", message: err.message });
  }
});

// POST - Create a new Comment
router.post("/comment", async (req, res) => {
  try {
    const { reelId, userId, parentCommentId, text } = req.body;
    
    const newComment = new Comment({
      reelId,
      userId,
      parentCommentId: parentCommentId || null,
      text
    });
    
    const savedComment = await newComment.save();
    res.status(201).json({ success: true, data: savedComment });
    console.log("Comment created:", savedComment._id);
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(500).json({ error: "Failed to create comment", message: err.message });
  }
});

module.exports = router;
