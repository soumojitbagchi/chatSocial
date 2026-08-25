import {roomData as Room} from "../../model/room.model.js";

export const createRoom = async ({roomname, description, createdBy}) => {
    if (!roomname || !roomname.trim()) {
        throw new Error("Room name is required");
    }
    const isAlreadyExists = await Room.findOne({ roomame: roomname.trim() });
    if (isAlreadyExists) {
        throw new Error("Room already exists");
    }
    const room = await Room.create({roomname, description, createdBy});
    return room;
};

export const getRoom = async ({roomId}) => {
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

export const updateRoom = async ({roomId, roomData}) => {
    const room = await Room.findByIdAndUpdate(roomId, roomData, { new: true });
    return room;
};

export const deleteRoom = async (roomId) => {
    const isRoomExists = await Room.findById(roomId);
    if (!isRoomExists) {
        throw new Error("Room not found");
    }
    const room = await Room.findByIdAndDelete(roomId);
    return room;
};