import express from "express";
import {
    getCallLogsController,
    deleteCallLogController,
    clearCallLogsController,
} from "../controller/call.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getCallLogsController);
router.delete("/", clearCallLogsController);
router.delete("/:id", deleteCallLogController);

export default router;
