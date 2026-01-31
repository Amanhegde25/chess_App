import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

// Middleware to verify JWT token for regular users
export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

// Middleware to verify admin access via JWT
export const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Access denied",
            message: "No token provided",
        });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isAdmin) {
            return res.status(403).json({
                error: "Access denied",
                message: "Admin privileges required",
            });
        }
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: "Access denied",
            message: "Invalid or expired token",
        });
    }
};
