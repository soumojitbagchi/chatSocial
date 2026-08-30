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

router.use(authMiddleware);

router.post("/", createRoomController);
router.get("/", getAllRoomsController);
router.get("/:roomId", getRoomController);
router.put("/:roomId", updateRoomController);
router.delete("/:roomId", deleteRoomController);

export default router;
