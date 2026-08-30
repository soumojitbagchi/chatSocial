import * as messageService from "../service/message.service.js";

export const createMessageController = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const roomId = req.body?.roomId;
        const text = req.body?.text ?? req.body?.message;

        const message = await messageService.createMessage({
            userId,
            roomId,
            text,
        });
        res.status(201).json({ success: true, data: message });
    } catch (error) {
        const statusCode = error.message === "Room not found" ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const getAllMessagesController = async (req, res) => {
    try {
        const roomId = req.query?.roomId || req.params?.roomId || req.query?.room_id;
        const { limit, page } = req.query;
        const currentUserId = req.user?.id || req.user?._id || null;

        if (!roomId) {
            return res.status(400).json({ success: false, message: "Room ID is required" });
        }

        const messages = await messageService.getAllMessages({ roomId, limit, page, userId: currentUserId });
        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        let statusCode = 400;
        if (error.message.includes("Unauthorized")) {
            statusCode = 403;
        } else if (error.message.includes("Room not found")) {
            statusCode = 404;
        } else if (error.message.includes("Invalid") || error.message.includes("required")) {
            statusCode = 400;
        } else {
            statusCode = 500;
        }
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const getMessageByIdController = async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await messageService.getMessageById(messageId);
        res.status(200).json({ success: true, data: message });
    } catch (error) {
        const statusCode = error.message === "Message not found" ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const updateMessageController = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const text = req.body?.text ?? req.body?.newMessage;

        const message = await messageService.updateMessage({
            messageId,
            userId,
            text,
        });
        res.status(200).json({ success: true, data: message });
    } catch (error) {
        let statusCode = 400;
        if (error.message === "Message not found") {
            statusCode = 404;
        } else if (error.message.includes("Unauthorized")) {
            statusCode = 403;
        }
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const deleteMessageController = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const message = await messageService.deleteMessage({
            messageId,
            userId,
        });
        res.status(200).json({ success: true, data: message });
    } catch (error) {
        let statusCode = 400;
        if (error.message === "Message not found") {
            statusCode = 404;
        } else if (error.message.includes("Unauthorized")) {
            statusCode = 403;
        }
        res.status(statusCode).json({ success: false, message: error.message });
    }
};