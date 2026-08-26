import express from "express";
import { 
    createMessageController, 
    getAllMessagesController, 
    getMessageByIdController, 
    updateMessageController, 
    deleteMessageController 
} from "../controller/message.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createMessageController);
router.get("/", getAllMessagesController);
router.get("/room/:roomId", getAllMessagesController);
router.get("/:messageId", getMessageByIdController);
router.put("/:messageId", authMiddleware, updateMessageController);
router.delete("/:messageId", authMiddleware, deleteMessageController);

export default router;