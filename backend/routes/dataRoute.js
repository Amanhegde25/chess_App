const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// Import models
const User = require("../models/User");
const ChessGame = require("../models/ChessGame");
const Reel = require("../models/Reel");
const Comment = require("../models/Comment");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// GET - View current token/session information
router.get("/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        error: "No token provided",
        message: "Please login to see your session info"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Calculate token expiration info
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;
    const expiresAt = new Date(decoded.exp * 1000).toISOString();
    const issuedAt = new Date(decoded.iat * 1000).toISOString();

    res.json({
      success: true,
      tokenInfo: {
        userId: decoded.userId || null,
        email: decoded.email,
        isAdmin: decoded.isAdmin,
        role: decoded.role || "user",
        issuedAt,
        expiresAt,
        expiresInSeconds: expiresIn,
        expiresInMinutes: Math.floor(expiresIn / 60)
      }
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", message: "Please login again" });
    }
    return res.status(401).json({ error: "Invalid token", message: error.message });
  }
});

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
        .populate("gameId"),
      Comment.find()
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


module.exports = router;
