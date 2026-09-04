import express from "express";
import {
    getCallHistoryController,
    getMissedCallsController,
    getUnseenMissedCountController,
    markMissedSeenController,
    deleteCallLogController,
    clearCallLogsController,
} from "../controller/call.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Order matters: specific paths before "/".
router.get("/missed", getMissedCallsController);
router.get("/unseen-count", getUnseenMissedCountController);
router.get("/", getCallHistoryController);
router.patch("/seen", markMissedSeenController);
router.delete("/", clearCallLogsController);
router.delete("/:id", deleteCallLogController);

export default router;
