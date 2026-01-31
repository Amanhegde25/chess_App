import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import {
    register,
    login,
    logout,
    setupProfile,
    deleteAccount,
} from "../controllers/authController.js";

const router = Router();

// POST /auth/register - Create a new user
router.post("/register", register);

// POST /auth/login - Authenticate user
router.post("/login", login);

// POST /auth/logout - Logout (client discards token)
router.post("/logout", verifyToken, logout);

// PUT /auth/setup-profile - Setup or update user profile
router.put("/setup-profile", verifyToken, setupProfile);

// DELETE /auth/delete-account - Delete user account
router.delete("/delete-account", verifyToken, deleteAccount);

export default router;
