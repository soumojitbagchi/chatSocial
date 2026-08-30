import Room from "../model/room.model.js";

export const createRoom = async ({ roomname, description = "", createdBy = null, isDirect = false, isPrivate = true, members = [], avatar = "" } = {}) => {
    if (!roomname || !roomname.trim()) {
        throw new Error("Room name is required");
    }
    const isAlreadyExists = await Room.findOne({ roomname: roomname.trim() });
    if (isAlreadyExists) {
        return isAlreadyExists;
    }

    const initialMembers = Array.isArray(members) ? [...members] : [];
    const initialAdmins = [];
    if (createdBy) {
        if (!initialMembers.some((m) => m && m.toString() === createdBy.toString())) {
            initialMembers.push(createdBy);
        }
        initialAdmins.push(createdBy);
    }

    const room = await Room.create({
        roomname: roomname.trim(),
        description: description || "",
        createdBy,
        isDirect: Boolean(isDirect),
        isPrivate: Boolean(isPrivate),
        avatar: avatar || "",
        admins: initialAdmins,
        members: initialMembers,
    });
    return room;
};
export const getRoom = async (roomId, currentUserId = null) => {
    if (!roomId) {
        throw new Error("Room ID is required");
    }
    const room = await Room.findById(roomId)
        .populate("members", "name username avatar about email phone profile")
        .populate("admins", "name username avatar about email phone profile");
    if (!room) {
        throw new Error("Room not found");
    }

    // If room is private or direct, verify membership
    if (currentUserId && (room.isPrivate || room.isDirect)) {
        const isMember = (
            (Array.isArray(room.members) && room.members.some((m) => (m._id ? m._id.toString() : m.toString()) === currentUserId.toString())) ||
            (Array.isArray(room.admins) && room.admins.some((a) => (a._id ? a._id.toString() : a.toString()) === currentUserId.toString())) ||
            (room.createdBy && room.createdBy.toString() === currentUserId.toString())
        );
        if (!isMember) {
            throw new Error("Unauthorized: You do not have access to this conversation");
        }
    }

    return room;
};

export const getAllRooms = async (currentUserId = null) => {
    let query = {};
    if (currentUserId) {
        query = {
            $or: [
                { isDirect: false, isPrivate: false },
                { members: currentUserId },
                { admins: currentUserId },
                { createdBy: currentUserId },
                // Also include direct rooms that have the user's ID in the roomname but empty members
                { isDirect: true, roomname: { $regex: currentUserId.toString() } },
            ],
        };
    }
    const rooms = await Room.find(query)
        .populate("members", "name username avatar about email phone profile")
        .populate("admins", "name username avatar about email phone profile")
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
    if (userId) {
        const strUserId = userId ? (userId._id ? userId._id.toString() : userId.toString()) : "";
        const isCreator = Boolean(room.createdBy && (room.createdBy._id ? room.createdBy._id.toString() : room.createdBy.toString()) === strUserId);
        const isAdmin = Boolean(Array.isArray(room.admins) && room.admins.some((a) => {
            const aId = a && typeof a === "object" && "_id" in a ? a._id.toString() : a?.toString();
            return aId === strUserId;
        }));
        if (!isCreator && !isAdmin) {
            throw new Error("Unauthorized: Only group admins can update group information");
        }
    }
    if (updateData.roomname && typeof updateData.roomname === "string" && updateData.roomname.trim()) {
        room.roomname = updateData.roomname.trim();
    }
    if (updateData.description !== undefined) {
        room.description = typeof updateData.description === "string" ? updateData.description.trim() : "";
    }
    if (updateData.avatar !== undefined) {
        room.avatar = typeof updateData.avatar === "string" ? updateData.avatar.trim() : "";
    }
    await room.save();
    return await Room.findById(roomId)
        .populate("members", "name username avatar about email phone profile")
        .populate("admins", "name username avatar about email phone profile");
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
/**
 * Add a new user to a group room (Admin only)
 */
export const addMemberToRoom = async ({ roomId, adminId, targetUserId }) => {
    if (!roomId || !targetUserId) {
        throw new Error("Room ID and Target User ID are required");
    }
    const room = await Room.findById(roomId);
    if (!room) {
        throw new Error("Room not found");
    }
    if (room.isDirect) {
        throw new Error("Cannot add members to a 1-to-1 direct conversation");
    }

    // Normalize Admin check
    const strAdminId = adminId ? (adminId._id ? adminId._id.toString() : adminId.toString()) : "";
    const isCreator = Boolean(room.createdBy && (room.createdBy._id ? room.createdBy._id.toString() : room.createdBy.toString()) === strAdminId);
    const isInAdmins = Boolean(Array.isArray(room.admins) && room.admins.some((a) => {
        const aId = a && typeof a === "object" && "_id" in a ? a._id.toString() : a?.toString();
        return aId === strAdminId;
    }));
    const isFirstMemberOrNoAdmin = Boolean(!room.createdBy && (!room.admins || room.admins.length === 0));
    const isAdmin = isCreator || isInAdmins || isFirstMemberOrNoAdmin;

    if (!isAdmin) {
        throw new Error("Unauthorized: Only group admins can add members");
    }

    // Flexible user lookup: by ObjectId, username, or email
    const { default: User } = await import("../model/user.model.js");
    let targetUser = null;
    const cleanTarget = targetUserId.toString().trim().replace(/^@/, "");

    const { default: mongoose } = await import("mongoose");
    if (mongoose.Types.ObjectId.isValid(cleanTarget)) {
        targetUser = await User.findById(cleanTarget);
    }

    if (!targetUser) {
        targetUser = await User.findOne({
            $or: [
                { username: cleanTarget.toLowerCase() },
                { email: cleanTarget.toLowerCase() },
                { name: new RegExp(`^${cleanTarget}$`, "i") },
            ],
        });
    }

    if (!targetUser) {
        throw new Error(`User "${cleanTarget}" was not found`);
    }

    const resolvedTargetId = targetUser._id;

    // Atomically add member
    const updated = await Room.findByIdAndUpdate(
        roomId,
        { $addToSet: { members: resolvedTargetId } },
        { new: true }
    )
        .populate("members", "name username avatar about email phone profile")
        .populate("admins", "name username avatar about email phone profile");
    return updated;
};

/**
 * Remove a member from a group room (Admin only or self-leave)
 */
export const removeMemberFromRoom = async ({ roomId, requesterId, targetUserId }) => {
    if (!roomId || !targetUserId) {
        throw new Error("Room ID and Target User ID are required");
    }
    const room = await Room.findById(roomId);
    if (!room) {
        throw new Error("Room not found");
    }
    if (room.isDirect) {
        throw new Error("Cannot remove members from a 1-to-1 direct conversation");
    }

    const { default: User } = await import("../model/user.model.js");
    const { default: mongoose } = await import("mongoose");
    let targetUser = null;
    const cleanTarget = targetUserId.toString().trim().replace(/^@/, "");

    if (mongoose.Types.ObjectId.isValid(cleanTarget)) {
        targetUser = await User.findById(cleanTarget);
    }
    if (!targetUser) {
        targetUser = await User.findOne({
            $or: [
                { username: cleanTarget.toLowerCase() },
                { email: cleanTarget.toLowerCase() },
                { name: new RegExp(`^${cleanTarget}$`, "i") },
            ],
        });
    }

    const resolvedTargetId = targetUser ? targetUser._id : (mongoose.Types.ObjectId.isValid(cleanTarget) ? cleanTarget : null);
    const strTargetId = resolvedTargetId ? resolvedTargetId.toString() : cleanTarget;
    const strRequesterId = requesterId ? (requesterId._id ? requesterId._id.toString() : requesterId.toString()) : "";

    const isSelfLeaving = strRequesterId === strTargetId;
    const isCreator = Boolean(room.createdBy && (room.createdBy._id ? room.createdBy._id.toString() : room.createdBy.toString()) === strRequesterId);
    const isInAdmins = Boolean(Array.isArray(room.admins) && room.admins.some((a) => {
        const aId = a && typeof a === "object" && "_id" in a ? a._id.toString() : a?.toString();
        return aId === strRequesterId;
    }));
    const isAdmin = isCreator || isInAdmins;

    if (!isSelfLeaving && !isAdmin) {
        throw new Error("Unauthorized: Only group admins can remove members");
    }

    const updated = await Room.findByIdAndUpdate(
        roomId,
        {
            $pull: {
                members: resolvedTargetId,
                admins: resolvedTargetId,
            },
        },
        { new: true }
    )
        .populate("members", "name username avatar about email phone profile")
        .populate("admins", "name username avatar about email phone profile");

    return updated;
};

export default {
    createRoom,
    getRoom,
    getAllRooms,
    updateRoom,
    deleteRoom,
    addMemberToRoom,
    removeMemberFromRoom,
};
