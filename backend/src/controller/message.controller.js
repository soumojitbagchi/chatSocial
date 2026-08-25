import * as messageService from "../service/message.service.js";

export const createMessageController = async (req, res) => {
    try {
        const message = await messageService.createMessage(req.body);
        res.status(201).json({ success: true, data: message });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAllMessagesController = async (req, res) => {
    try {
        const messages = await messageService.getAllMessages(req.query);
        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMessageByIdController = async (req, res) => {
    try {
        const message = await messageService.getMessageById(req.params.messageId);
        res.status(200).json({ success: true, data: message });
    } catch (error) {
        const statusCode = error.message === "Message not found" ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const updateMessageController = async (req, res) => {
    try {
        const message = await messageService.updateMessage(req.params.messageId, req.body);
        res.status(200).json({ success: true, data: message });
    } catch (error) {
        const statusCode = error.message === "Message not found" ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const deleteMessageController = async (req, res) => {
    try {
        const message = await messageService.deleteMessage(req.params.messageId);
        res.status(200).json({ success: true, data: message });
    } catch (error) {
        const statusCode = error.message === "Message not found" ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};