import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
    JWT_SECRET,
    JWT_EXPIRES_IN,
    SALT_ROUNDS,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
} from "../config/env.js";

// POST /auth/register - Create a new user
export const register = async (req, res) => {
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
                chessRating: 800,
            },
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, isAdmin: false },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
        });
        console.log("POST /auth/register - User registered:", user.email);
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// POST /auth/login - Authenticate user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Check if admin login
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            // Generate admin JWT token
            const token = jwt.sign(
                { email: ADMIN_EMAIL, isAdmin: true, role: "admin" },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            console.log("POST /auth/login - Admin login successful" + ADMIN_EMAIL);
            return res.json({
                message: "Admin login successful",
                isAdmin: true,
                token,
                user: {
                    email: ADMIN_EMAIL,
                    role: "admin",
                },
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

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, isAdmin: false },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            message: "Login successful",
            isAdmin: false,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
        });
        console.log("POST /auth/login - User login successful:", user.email);
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// POST /auth/logout - Client should discard token
export const logout = (req, res) => {
    res.json({ message: "Logout successful. Please discard your token." });
    console.log("POST /auth/logout - User logged out: " + req.user.email);
};

// PUT /auth/setup-profile - Setup or update user profile
export const setupProfile = async (req, res) => {
    try {
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
            return res.status(400).json({
                error: "At least one profile field is required (name, avatarUrl, bio, or chessRating)",
            });
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
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
                profile: updatedUser.profile,
            },
        });
        console.log("PUT /auth/setup-profile - Profile updated:", updatedUser.email);
    } catch (error) {
        console.error("Profile setup error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// DELETE /auth/delete-account - Delete user account
export const deleteAccount = async (req, res) => {
    try {
        // Delete user from database
        const deletedUser = await User.findByIdAndDelete(req.user.userId);
        if (!deletedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "Account deleted successfully" });
        console.log("DELETE /auth/delete-account - Account deleted:", req.user.email);
    } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
