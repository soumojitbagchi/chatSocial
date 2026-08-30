import Message from "../model/message.model.js";
import Room from "../model/room.model.js";
import mongoose from "mongoose";

/**
 * Create a new message in a room
 */
export const createMessage = async (param1, param2, param3) => {
    let userId;
    let roomId;
    let text;

    if (typeof param1 === "object" && param1 !== null) {
        userId = param1.userId;
        roomId = param1.roomId;
        text = param1.text ?? param1.message;
    } else {
        userId = param1;
        roomId = param2;
        text = param3;
    }

    const trimmedText = typeof text === "string" ? text.trim() : "";
    if (!userId || !roomId || !trimmedText) {
        throw new Error("User ID, Room ID, and message text are required");
    }

    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid User ID or Room ID");
    }

    if (mongoose.connection.readyState === 1) {
        const roomExists = await Room.findById(roomId);
        if (!roomExists) {
            throw new Error("Room not found");
        }

        // Validate participant access
        if (roomExists.isDirect) {
            const isParticipant = (
                (Array.isArray(roomExists.members) && roomExists.members.some((m) => m && m.toString() === userId.toString())) ||
                (roomExists.createdBy && roomExists.createdBy.toString() === userId.toString()) ||
                (roomExists.roomname && roomExists.roomname.includes(userId.toString()))
            );
            if (!isParticipant) {
                throw new Error("Unauthorized: You are not a participant in this direct chat");
            }
        } else if (roomExists.isPrivate && Array.isArray(roomExists.members) && roomExists.members.length > 0) {
            const isMember = (
                roomExists.members.some((m) => m && m.toString() === userId.toString()) ||
                (roomExists.createdBy && roomExists.createdBy.toString() === userId.toString()) ||
                (Array.isArray(roomExists.admins) && roomExists.admins.some((a) => a && a.toString() === userId.toString()))
            );
            if (!isMember) {
                throw new Error("Unauthorized: You are not a member of this room");
            }
        }
        const message = await Message.create({
            userId,
            roomId,
            text: trimmedText,
        });

        return await Message.findById(message._id).populate("userId", "name username avatar").lean();
    }

    return {
        _id: new mongoose.Types.ObjectId().toString(),
        userId,
        roomId,
        text: trimmedText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};
/**
 * Get messages for a specific room with pagination
 */
export const getAllMessages = async (param1, param2, param3, param4) => {
    let roomId;
    let limit = 50;
    let page = 1;
    let requesterId = null;

    if (typeof param1 === "object" && param1 !== null) {
        roomId = param1.roomId || param1.room_id;
        if (param1.limit !== undefined) limit = param1.limit;
        if (param1.page !== undefined) page = param1.page;
        requesterId = param1.userId || param1.requesterId || param2 || null;
    } else {
        roomId = param1;
        if (param2 !== undefined) limit = param2;
        if (param3 !== undefined) page = param3;
        requesterId = param4 || null;
    }

    if (requesterId && mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(roomId)) {
        const roomExists = await Room.findById(roomId).select("members createdBy admins isPrivate isDirect roomname");
        if (roomExists) {
            if (roomExists.isDirect) {
                const isParticipant = (
                    (Array.isArray(roomExists.members) && roomExists.members.some((m) => m && m.toString() === requesterId.toString())) ||
                    (roomExists.createdBy && roomExists.createdBy.toString() === requesterId.toString()) ||
                    (roomExists.roomname && roomExists.roomname.includes(requesterId.toString()))
                );
                if (!isParticipant) {
                    throw new Error("Unauthorized: You are not a participant in this direct chat");
                }
            } else if (roomExists.isPrivate && Array.isArray(roomExists.members) && roomExists.members.length > 0) {
                const isMember = (
                    roomExists.members.some((m) => m && m.toString() === requesterId.toString()) ||
                    (roomExists.createdBy && roomExists.createdBy.toString() === requesterId.toString()) ||
                    (Array.isArray(roomExists.admins) && roomExists.admins.some((a) => a && a.toString() === requesterId.toString()))
                );
                if (!isMember) {
                    throw new Error("Unauthorized: You are not a member of this room");
                }
            }
        }
    }
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
        .populate("userId", "name username avatar")
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

    const message = await Message.findById(messageId).populate("userId", "name username avatar").lean();
    if (!message) {
        throw new Error("Message not found");
    }

    return message;
};

/**
 * Update message text with ownership validation
 */
export const updateMessage = async (param1, param2, param3) => {
    let messageId;
    let userId;
    let text;

    if (typeof param1 === "object" && param1 !== null) {
        messageId = param1.messageId || param1.id || param1._id;
        userId = param1.userId;
        text = param1.text ?? param1.newMessage;
    } else {
        messageId = param1;
        if (typeof param2 === "object" && param2 !== null) {
            text = param2.text ?? param2.newMessage;
            userId = param2.userId || param3;
        } else {
            text = param2;
            userId = param3;
        }
    }

    const trimmedText = typeof text === "string" ? text.trim() : "";
    if (!messageId || !trimmedText) {
        throw new Error("Message ID and updated text are required");
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new Error("Invalid Message ID");
    }

    const message = await Message.findById(messageId);
    if (!message) {
        throw new Error("Message not found");
    }

    if (userId && message.userId.toString() !== userId.toString()) {
        throw new Error("Unauthorized: You can only edit your own messages");
    }

    message.text = trimmedText;
    message.edited = true;
    await message.save();

    return await Message.findById(message._id).populate("userId", "name username avatar").lean();
};

/**
 * Delete a message (soft delete) with ownership validation
 */
export const deleteMessage = async (param1, param2) => {
    let messageId;
    let userId;

    if (typeof param1 === "object" && param1 !== null) {
        messageId = param1.messageId || param1.id || param1._id;
        userId = param1.userId;
    } else {
        messageId = param1;
        userId = param2;
    }

    if (!messageId) {
        throw new Error("Message ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new Error("Invalid Message ID");
    }

    const message = await Message.findById(messageId);
    if (!message) {
        throw new Error("Message not found");
    }

    if (userId && message.userId.toString() !== userId.toString()) {
        throw new Error("Unauthorized: You can only delete your own messages");
    }

    message.deleted = true;
    message.text = "This message was deleted";
    await message.save();

    return await Message.findById(message._id).populate("userId", "name username avatar").lean();
};
