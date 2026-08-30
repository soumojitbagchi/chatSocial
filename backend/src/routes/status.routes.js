import express from "express";
import {
    createStatusController,
    getStatusesFeedController,
    deleteStatusController,
    viewStatusController,
    replyToStatusController,
} from "../controller/status.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { storyUploadMiddleware } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Active 24-hour feed
router.get("/", getStatusesFeedController);

// Create status (supports image, video, and text statuses)
router.post("/", storyUploadMiddleware, createStatusController);

// Delete status by ID (creator only)
router.delete("/:id", deleteStatusController);

// Mark status viewed
router.post("/:id/view", viewStatusController);

// Reply to status directly into 1-to-1 conversation
router.post("/:id/reply", replyToStatusController);

export default router;
