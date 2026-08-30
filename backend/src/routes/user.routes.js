import express from "express";
import {
    searchUsersController,
    sendConnectionRequestController,
    acceptConnectionRequestController,
    rejectConnectionRequestController,
    getConnectionsController,
    getProfileController,
    updateProfileController,
} from "../controller/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/profile", getProfileController);
router.put("/profile", updateProfileController);
router.patch("/profile", updateProfileController);
router.get("/search", searchUsersController);
router.get("/connections", getConnectionsController);
router.post("/connect", sendConnectionRequestController);
router.post("/accept", acceptConnectionRequestController);
router.post("/reject", rejectConnectionRequestController);

export default router;
