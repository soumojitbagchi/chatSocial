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
                // Also include direct rooms that have the user's ID in the roomname but empty members
                { isDirect: true, roomname: { $regex: currentUserId.toString() } },
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

    // Lazy-import User model to resolve names for rooms with empty members
    const { default: User } = await import("../model/user.model.js");

    const resolvedRooms = await Promise.all(rooms.map(async (r) => {
        if (r.isDirect) {
            let otherUser = null;

            if (Array.isArray(r.members) && r.members.length > 0) {
                // Normal path: members are populated
                otherUser = r.members.find((m) => {
                    if (!m) return false;
                    const mId = m._id ? m._id.toString() : m.toString();
                    return mId !== strCurrentUserId;
                }) || r.members[0];
            }

            // Fallback: members array is empty — extract IDs from roomname
            if (!otherUser || (typeof otherUser === "object" && !otherUser.name)) {
                const match = r.roomname?.match(/^direct_([a-f0-9]+)_([a-f0-9]+)$/);
                if (match) {
                    const [, id1, id2] = match;
                    const otherUserId = id1 === strCurrentUserId ? id2 : id1;
                    try {
                        const lookedUpUser = await User.findById(otherUserId)
                            .select("name username avatar about email")
                            .lean();
                        if (lookedUpUser) {
                            otherUser = lookedUpUser;

                            // Backfill the room's members array so this fallback isn't needed again
                            await Room.updateOne(
                                { _id: r._id, $or: [{ members: { $size: 0 } }, { members: { $exists: false } }] },
                                { $set: { members: [id1, id2] } }
                            );
                        }
                    } catch { /* user lookup failed, proceed with fallback */ }
                }
            }

            const otherId = otherUser ? (otherUser._id ? otherUser._id.toString() : otherUser.toString()) : null;
            const otherName = (otherUser && typeof otherUser === "object" && otherUser.name) ? otherUser.name : (r.roomname || "Direct Message");

            return {
                ...r,
                displayName: otherName,
                roomname: otherName,
                avatar: (otherUser && typeof otherUser === "object" && otherUser.avatar) || "",
                contactUser: otherId ? {
                    id: otherId,
                    name: otherName,
                    username: (otherUser && typeof otherUser === "object" && otherUser.username) || otherName,
                    avatar: (otherUser && typeof otherUser === "object" && otherUser.avatar) || "",
                    about: (otherUser && typeof otherUser === "object" && otherUser.about) || "",
                } : null,
            };
        }
        return r;
    }));

    return resolvedRooms;
};

export const updateRoom = async (roomId, updateData = {}, userId = null) => {
    if (!roomId) {
        throw new Error("Room ID is required");
    }
    const room = await Room.findById(roomId);
    if (!room) {
        throw new Error("Room not found");
    }
    if (userId && room.createdBy && room.createdBy.toString() !== userId.toString()) {
        throw new Error("Unauthorized: Only room creator can update this room");
    }
    Object.assign(room, updateData);
    await room.save();
    return room;
};

export const deleteRoom = async (roomId, userId = null) => {
    if (!roomId) {
        throw new Error("Room ID is required");
    }
    const room = await Room.findById(roomId);
    if (!room) {
        throw new Error("Room not found");
    }
    if (userId && room.createdBy && room.createdBy.toString() !== userId.toString() && !room.isDirect) {
        throw new Error("Unauthorized: Only room creator can delete this room");
    }
    await Room.findByIdAndDelete(roomId);
    return room;
};

export default {
    createRoom,
    getRoom,
    getAllRooms,
    updateRoom,
    deleteRoom,
};
