import Room from "../model/room.model.js";

export const createRoom = async ({ roomname, description = "", createdBy = null, isDirect = false, members = [] } = {}) => {
    if (!roomname || !roomname.trim()) {
        throw new Error("Room name is required");
    }
    const isAlreadyExists = await Room.findOne({ roomname: roomname.trim() });
    if (isAlreadyExists) {
        return isAlreadyExists;
    }
    const room = await Room.create({
        roomname: roomname.trim(),
        description: description || "",
        createdBy,
        isDirect: Boolean(isDirect),
        members,
    });
    return room;
};

export const getRoom = async (roomId) => {
    if (!roomId) {
        throw new Error("Room ID is required");
    }
    const room = await Room.findById(roomId).populate("members", "name username avatar about email");
    if (!room) {
        throw new Error("Room not found");
    }
    return room;
};

export const getAllRooms = async (currentUserId = null) => {
    let query = {};
    if (currentUserId) {
        query = {
            $or: [
                { isDirect: { $ne: true } },
                { members: currentUserId },
            ],
        };
    }

    const rooms = await Room.find(query)
        .populate("members", "name username avatar about email")
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();

    if (!currentUserId) {
        return rooms;
    }

    const strCurrentUserId = currentUserId.toString();
    return rooms.map((r) => {
        if (r.isDirect && Array.isArray(r.members) && r.members.length > 0) {
            const otherUser = r.members.find((m) => m._id && m._id.toString() !== strCurrentUserId) || r.members[0];
            return {
                ...r,
                displayName: otherUser?.name || r.roomname,
                roomname: otherUser?.name || r.roomname,
                avatar: otherUser?.avatar || "",
                contactUser: otherUser ? {
                    id: otherUser._id.toString(),
                    name: otherUser.name,
                    username: otherUser.username,
                    avatar: otherUser.avatar || "",
                    about: otherUser.about || "",
                } : null,
            };
        }
        return r;
    });
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

export default {
    createRoom,
    getRoom,
    getAllRooms,
    updateRoom,
    deleteRoom,
};
