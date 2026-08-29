import express from "express";
import {
    createRoomController,
    getRoomController,
    getAllRoomsController,
    updateRoomController,
    deleteRoomController,
} from "../controller/room.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createRoomController);
router.get("/", authMiddleware, getAllRoomsController);
router.get("/:roomId", getRoomController);
router.put("/:roomId", authMiddleware, updateRoomController);
router.delete("/:roomId", authMiddleware, deleteRoomController);

export default router;
