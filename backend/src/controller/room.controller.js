import { createRoom, getRoom, getAllRooms, updateRoom, deleteRoom } from "../sockets/service/room.service.js";

export const createRoomController = async (req, res) => {
    try {
        const { roomname, description } = req.body;
        const room = await createRoom({ roomname, description });
        res.status(201).json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getRoomController = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await getRoom(roomId);
        res.status(200).json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllRoomsController = async (req, res) => {
    try {
        const rooms = await getAllRooms();
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateRoomController = async (req, res) => {
    try {
        const room = await updateRoom(req.params.id, req.body);
        res.status(200).json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteRoomController = async (req, res) => {
    try {
        const { roomId } = req.body;
        const room = await deleteRoom(roomId);
        res.status(201).json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
