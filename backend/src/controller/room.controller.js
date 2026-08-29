import {
    createRoom,
    getRoom,
    getAllRooms,
    updateRoom,
    deleteRoom,
} from "../service/room.service.js";

export const createRoomController = async (req, res) => {
    try {
        const { roomname, description } = req.body;
        const createdBy = req.user?.id || req.user?._id || null;
        const room = await createRoom({ roomname, description, createdBy });
        res.status(201).json({ success: true, data: room });
    } catch (error) {
        const statusCode = error.message.includes("required") || error.message.includes("exists") ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const getRoomController = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await getRoom(roomId);
        res.status(200).json({ success: true, data: room });
    } catch (error) {
        const statusCode = error.message === "Room not found" ? 404 : 400;
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
        const room = await updateRoom(roomId, req.body);
        res.status(200).json({ success: true, data: room });
    } catch (error) {
        const statusCode = error.message === "Room not found" ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

export const deleteRoomController = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await deleteRoom(roomId);
        res.status(200).json({ success: true, message: "Room deleted successfully", data: room });
    } catch (error) {
        const statusCode = error.message === "Room not found" ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};
