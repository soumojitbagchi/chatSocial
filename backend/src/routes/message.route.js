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

router.use(authMiddleware);

router.post("/", createMessageController);
router.get("/", getAllMessagesController);
router.get("/room/:roomId", getAllMessagesController);
router.get("/:messageId", getMessageByIdController);
router.put("/:messageId", updateMessageController);
router.delete("/:messageId", deleteMessageController);

export default router;