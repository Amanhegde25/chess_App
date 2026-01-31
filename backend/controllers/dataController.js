import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ChessGame from "../models/ChessGame.js";
import Reel from "../models/Reel.js";
import Comment from "../models/Comment.js";
import { JWT_SECRET } from "../config/env.js";

// GET /data/me - View current token/session information
export const getMe = (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "No token provided",
                message: "Please login to see your session info",
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
                expiresInMinutes: Math.floor(expiresIn / 60),
            },
        });
        console.log("GET /data/me - Token info retrieved");
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired", message: "Please login again" });
        }
        return res.status(401).json({ error: "Invalid token", message: error.message });
    }
};

// GET /data/all - Get all data from DB
export const getAllData = async (req, res) => {
    try {
        const [users, chessGames, reels, comments] = await Promise.all([
            User.find(),
            ChessGame.find(),
            Reel.find().populate("gameId"),
            Comment.find().populate("reelId"),
        ]);

        res.json({
            users,
            chessGames,
            reels,
            comments,
        });
        console.log("GET /data/all - All data fetched");
    } catch (err) {
        console.error("Data route error:", err);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};
