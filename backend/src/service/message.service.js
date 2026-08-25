import Message from "../model/message.model.js";
import Room from "../model/room.model.js";
import mongoose from "mongoose";

/**
 * Create a new message in a room
 */
export const createMessage = async ({ userId, roomId, text }) => {
    const trimmedText = typeof text === "string" ? text.trim() : "";
    if (!userId || !roomId || !trimmedText) {
        throw new Error("User ID, Room ID, and message text are required");
    }

    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid User ID or Room ID");
    }

    const roomExists = await Room.findById(roomId);
    if (!roomExists) {
        throw new Error("Room not found");
    }

    const message = await Message.create({
        userId,
        roomId,
        text: trimmedText,
    });

    return await message.populate("userId", "name username");
};

/**
 * Get messages for a specific room with pagination
 */
export const getAllMessages = async ({ roomId, limit = 50, page = 1 } = {}) => {
    if (!roomId) {
        throw new Error("Room ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
        throw new Error("Invalid Room ID");
    }

    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const parsedPage = Math.max(Number(page) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const messages = await Message.find({ roomId, deleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate("userId", "name username")
        .lean();

    return messages.reverse();
};

/**
 * Get a single message by ID
 */
export const getMessageById = async (messageId) => {
    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
        throw new Error("Valid Message ID is required");
    }

    const message = await Message.findById(messageId).populate("userId", "name username");
    if (!message) {
        throw new Error("Message not found");
    }

    return message;
};

/**
 * Update message text with ownership validation
 */
export const updateMessage = async ({ messageId, userId, text }) => {
    const trimmedText = typeof text === "string" ? text.trim() : "";
    if (!messageId || !userId || !trimmedText) {
        throw new Error("Message ID, User ID, and updated text are required");
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new Error("Invalid Message ID");
    }

    const message = await Message.findById(messageId);
    if (!message) {
        throw new Error("Message not found");
    }

    if (message.userId.toString() !== userId.toString()) {
        throw new Error("Unauthorized: You can only edit your own messages");
    }

    message.text = trimmedText;
    message.edited = true;
    await message.save();

    return await message.populate("userId", "name username");
};

/**
 * Delete a message (soft delete) with ownership validation
 */
export const deleteMessage = async ({ messageId, userId }) => {
    if (!messageId || !userId) {
        throw new Error("Message ID and User ID are required");
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new Error("Invalid Message ID");
    }

    const message = await Message.findById(messageId);
    if (!message) {
        throw new Error("Message not found");
    }

    if (message.userId.toString() !== userId.toString()) {
        throw new Error("Unauthorized: You can only delete your own messages");
    }

    message.deleted = true;
    message.text = "This message was deleted";
    await message.save();

    return message;
};
