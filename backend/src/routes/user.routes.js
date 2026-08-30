import express from "express";
import {
    searchUsersController,
    sendConnectionRequestController,
    acceptConnectionRequestController,
    rejectConnectionRequestController,
    getConnectionsController,
    getProfileController,
    updateProfileController,
    uploadAvatarController,
} from "../controller/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import avatarUploadMiddleware from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/profile", getProfileController);
router.put("/profile", avatarUploadMiddleware, updateProfileController);
router.patch("/profile", avatarUploadMiddleware, updateProfileController);
router.post("/avatar", avatarUploadMiddleware, uploadAvatarController);
router.put("/avatar", avatarUploadMiddleware, uploadAvatarController);
router.get("/search", searchUsersController);
router.get("/connections", getConnectionsController);
router.post("/connect", sendConnectionRequestController);
router.post("/accept", acceptConnectionRequestController);
router.post("/reject", rejectConnectionRequestController);

export default router;
