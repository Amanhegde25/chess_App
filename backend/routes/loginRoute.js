const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");
const User = require("../models/User");

const SALT_ROUNDS = 10;

// POST /auth/register - Create a new user
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Username, email, and password are required" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(409).json({ error: "User with this email or username already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Create new user with empty profile
        const user = new User({
            username,
            email,
            password: hashedPassword,
            profile: {
                name: null,
                avatarUrl: null,
                bio: null,
                chessRating: 800  // default rating
            }
        });

        await user.save();

        // Store user ID in session
        req.session.userId = user._id;

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /auth/login - Authenticate user
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Check if admin login
        const adminEmail = process.env.AdminEmail;
        const adminPassword = process.env.AdminPassword;

        if (email === adminEmail && password === adminPassword) {
            // Admin login successful
            req.session.isAdmin = true;
            req.session.adminEmail = email;

            return res.json({
                message: "Admin login successful",
                isAdmin: true,
                user: {
                    email: adminEmail,
                    role: "admin"
                }
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Store user ID in session
        req.session.userId = user._id;
        req.session.isAdmin = false;

        res.json({
            message: "Login successful",
            isAdmin: false,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /auth/logout - End session
router.post("/logout", (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
        return res.status(401).json({ error: "You are not logged in" });
    }

    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logout successful" });
    });
});

// PUT /auth/setup-profile - Setup or update user profile
router.put("/setup-profile", async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.userId) {
            return res.status(401).json({ error: "You must be logged in to setup your profile" });
        }

        const { name, avatarUrl, bio, chessRating } = req.body;

        // Build profile update object (only include provided fields)
        const profileUpdate = {};
        if (name !== undefined) profileUpdate["profile.name"] = name;
        if (avatarUrl !== undefined) profileUpdate["profile.avatarUrl"] = avatarUrl;
        if (bio !== undefined) profileUpdate["profile.bio"] = bio;
        if (chessRating !== undefined) {
            // Validate chess rating is a number
            if (typeof chessRating !== "number" || chessRating < 0) {
                return res.status(400).json({ error: "Chess rating must be a positive number" });
            }
            profileUpdate["profile.chessRating"] = chessRating;
        }

        // Check if at least one field is provided
        if (Object.keys(profileUpdate).length === 0) {
            return res.status(400).json({ error: "At least one profile field is required (name, avatarUrl, bio, or chessRating)" });
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            req.session.userId,
            { $set: profileUpdate },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            message: "Profile updated successfully",
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                profile: updatedUser.profile
            }
        });
    } catch (error) {
        console.error("Profile setup error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /auth/delete-account - Delete user account
router.delete("/delete-account", async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.userId) {
            return res.status(401).json({ error: "You must be logged in to delete your account" });
        }

        const userId = req.session.userId;

        // Delete user from database
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error("Session destroy error:", err);
            }
            res.clearCookie("connect.sid");
            res.json({ message: "Account deleted successfully" });
        });
    } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
