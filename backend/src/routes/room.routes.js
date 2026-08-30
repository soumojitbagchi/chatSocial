import express from "express";
import {
    createRoomController,
    getRoomController,
    getAllRoomsController,
    updateRoomController,
    deleteRoomController,
    addMemberController,
    removeMemberController,
} from "../controller/room.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createRoomController);
router.get("/", getAllRoomsController);
router.get("/:roomId", getRoomController);
router.put("/:roomId", updateRoomController);
router.delete("/:roomId", deleteRoomController);
router.post("/:roomId/members", addMemberController);
router.post("/:roomId/member", addMemberController);
router.delete("/:roomId/members/:userId", removeMemberController);
router.delete("/:roomId/member/:userId", removeMemberController);

export default router;
