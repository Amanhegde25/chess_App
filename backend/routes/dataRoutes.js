import { Router } from "express";
import { getMe, getAllData } from "../controllers/dataController.js";

const router = Router();

// GET /data/me - View current token/session information
router.get("/me", getMe);

// GET /data/all - Get all data from DB
router.get("/all", getAllData);

export default router;
