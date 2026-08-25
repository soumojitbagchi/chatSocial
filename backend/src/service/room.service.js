import Room from "../model/room.model.js";

export const createRoom = async ({ roomname, description = "", createdBy = null } = {}) => {
    if (!roomname || !roomname.trim()) {
        throw new Error("Room name is required");
    }
    const isAlreadyExists = await Room.findOne({ roomname: roomname.trim() });
    if (isAlreadyExists) {
        throw new Error("Room already exists");
    }
    const room = await Room.create({
        roomname: roomname.trim(),
        description: description || "",
        createdBy,
    });
    return room;
};

export const getRoom = async (roomId) => {
    if (!roomId) {
        throw new Error("Room ID is required");
    }
    const room = await Room.findById(roomId);
    if (!room) {
        throw new Error("Room not found");
    }
    return room;
};

export const getAllRooms = async () => {
    const rooms = await Room.find().sort({ createdAt: -1 });
    return rooms;
};

export const updateRoom = async (roomId, updateData = {}) => {
    if (!roomId) {
        throw new Error("Room ID is required");
    }
    const room = await Room.findByIdAndUpdate(roomId, updateData, { new: true, runValidators: true });
    if (!room) {
        throw new Error("Room not found");
    }
    return room;
};

export const deleteRoom = async (roomId) => {
    if (!roomId) {
        throw new Error("Room ID is required");
    }
    const room = await Room.findByIdAndDelete(roomId);
    if (!room) {
        throw new Error("Room not found");
    }
    return room;
};
