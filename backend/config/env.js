import dotenv from "dotenv";
dotenv.config();

// Server Configuration
export const PORT = process.env.PORT || 5000;
export const APP_NAME = process.env.App_NAME || "ReelsApp";

// Database Configuration
export const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reels";

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Auth Constants
export const SALT_ROUNDS = 10;

// Admin Credentials
export const ADMIN_EMAIL = process.env.AdminEmail || "admin@admin.com";
export const ADMIN_PASSWORD = process.env.AdminPassword || "admin";

export default {
    PORT,
    APP_NAME,
    MONGO_URI,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    SALT_ROUNDS,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
};
