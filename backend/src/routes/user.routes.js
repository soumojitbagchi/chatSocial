import express from "express";
import {
    searchUsersController,
    sendConnectionRequestController,
    acceptConnectionRequestController,
    rejectConnectionRequestController,
    getConnectionsController,
} from "../controller/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/search", searchUsersController);
router.get("/connections", getConnectionsController);
router.post("/connect", sendConnectionRequestController);
router.post("/accept", acceptConnectionRequestController);
router.post("/reject", rejectConnectionRequestController);

export default router;
