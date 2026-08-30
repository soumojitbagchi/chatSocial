import {
    createRoom,
    getRoom,
    getAllRooms,
    updateRoom,
    deleteRoom,
    addMemberToRoom,
    removeMemberFromRoom,
} from "../service/room.service.js";

export const createRoomController = async (req, res) => {
    try {
        const { roomname, description, isPrivate, members, avatar } = req.body;
        const createdBy = req.user?.id || req.user?._id || null;
        const room = await createRoom({ roomname, description, createdBy, isPrivate, members, avatar });
        res.status(201).json({ success: true, data: room });
    } catch (error) {
        const statusCode = error.message.includes("required") || error.message.includes("exists") ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const getRoomController = async (req, res) => {
    try {
        const { roomId } = req.params;
        const currentUserId = req.user?.id || req.user?._id || null;
        const room = await getRoom(roomId, currentUserId);
        res.status(200).json({ success: true, data: room });
    } catch (error) {
        let statusCode = 400;
        if (error.message === "Room not found") {
            statusCode = 404;
        } else if (error.message.includes("Unauthorized")) {
            statusCode = 403;
        }
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const getAllRoomsController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id || null;
        const rooms = await getAllRooms(currentUserId);
        res.status(200).json({ success: true, data: rooms });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateRoomController = async (req, res) => {
    try {
        const { roomId } = req.params;
        const currentUserId = req.user?.id || req.user?._id;
        const room = await updateRoom(roomId, req.body, currentUserId);
        res.status(200).json({ success: true, data: room });
    } catch (error) {
        let statusCode = 400;
        if (error.message === "Room not found") {
            statusCode = 404;
        } else if (error.message.includes("Unauthorized")) {
            statusCode = 403;
        }
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const deleteRoomController = async (req, res) => {
    try {
        const { roomId } = req.params;
        const currentUserId = req.user?.id || req.user?._id;
        const room = await deleteRoom(roomId, currentUserId);
        res.status(200).json({ success: true, message: "Room deleted successfully", data: room });
    } catch (error) {
        let statusCode = 400;
        if (error.message === "Room not found") {
            statusCode = 404;
        } else if (error.message.includes("Unauthorized")) {
            statusCode = 403;
        }
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const addMemberController = async (req, res) => {
    try {
        const { roomId } = req.params;
        const adminId = req.user?.id || req.user?._id;
        const targetUserId = (req.body.userId || req.body.targetUserId || "").toString().trim();

        const room = await addMemberToRoom({ roomId, adminId, targetUserId });
        res.status(200).json({ success: true, message: "Member added successfully", data: room });
    } catch (error) {
        let statusCode = 400;
        if (error.message.includes("not found")) {
            statusCode = 404;
        } else if (error.message.includes("Unauthorized")) {
            statusCode = 403;
        }
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const removeMemberController = async (req, res) => {
    try {
        const { roomId, userId } = req.params;
        const requesterId = req.user?.id || req.user?._id;
        const targetUserId = userId || req.body?.userId;

        const room = await removeMemberFromRoom({ roomId, requesterId, targetUserId });
        res.status(200).json({ success: true, message: "Member removed successfully", data: room });
    } catch (error) {
        let statusCode = 400;
        if (error.message.includes("not found")) {
            statusCode = 404;
        } else if (error.message.includes("Unauthorized")) {
            statusCode = 403;
        }
        res.status(statusCode).json({ success: false, message: error.message });
    }
};
