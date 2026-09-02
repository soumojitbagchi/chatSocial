import User from "../model/user.model.js";
import Room from "../model/room.model.js";
import mongoose from "mongoose";
import * as presenceService from "../sockets/service/presence.service.js";
import { uploadImage, deleteImage } from "../service/imagekit.service.js";
import userCache, {
    overlayConnectionPresence,
    personalizeSearchCandidates,
} from "../service/userCache.service.js";

const respondWithControllerError = (res, error, fallbackMessage) => {
    if (error?.code === "REDIS_UNAVAILABLE") {
        return res.status(503).json({
            success: false,
            message: "User data cache is temporarily unavailable",
        });
    }
    return res.status(500).json({
        success: false,
        message: error.message || fallbackMessage,
    });
};

const loadSearchCandidateDtos = async (query) => {
    const filter = {};
    if (query) {
        const regex = new RegExp(query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
        filter.$or = [
            { username: regex },
            { name: regex },
            { email: regex },
        ];
    }

    return User.find(filter)
        .select("name username email avatar about")
        .limit(query ? 21 : 16)
        .lean();
};

const loadConnectionSnapshot = async (currentUserId) => {
    const currentUser = await User.findById(currentUserId)
        .populate("contacts", "name username email avatar about lastSeen")
        .populate("connectionRequests.from", "name username email avatar about")
        .populate("sentRequests.to", "name username email avatar about")
        .lean();

    if (!currentUser) return null;

    const directRoomNames = (currentUser.contacts || []).map((contact) => (
        `direct_${[currentUserId.toString(), contact._id.toString()].sort().join("_")}`
    ));
    const rooms = directRoomNames.length > 0
        ? await Room.find({ roomname: { $in: directRoomNames } }).select("_id roomname").lean()
        : [];
    const roomMap = new Map(rooms.map((room) => [room.roomname, room._id.toString()]));

    const contacts = (currentUser.contacts || []).map((contact) => {
        const contactId = contact._id.toString();
        const directName = `direct_${[currentUserId.toString(), contactId].sort().join("_")}`;
        return {
            id: contactId,
            name: contact.name,
            username: contact.username,
            email: contact.email,
            avatar: contact.avatar || "",
            about: contact.about || "",
            roomId: roomMap.get(directName) || null,
        };
    });

    const pendingIncoming = (currentUser.connectionRequests || [])
        .filter((request) => request.status === "pending" && request.from)
        .map((request) => ({
            id: request.from._id.toString(),
            name: request.from.name,
            username: request.from.username,
            email: request.from.email,
            avatar: request.from.avatar || "",
            about: request.from.about || "",
            requestedAt: request.createdAt,
        }));

    const pendingOutgoing = (currentUser.sentRequests || [])
        .filter((request) => request.status === "pending" && request.to)
        .map((request) => ({
            id: request.to._id.toString(),
            name: request.to.name,
            username: request.to.username,
            email: request.to.email,
            avatar: request.to.avatar || "",
            about: request.to.about || "",
            requestedAt: request.createdAt,
        }));

    return { contacts, pendingIncoming, pendingOutgoing };
};
export const searchUsersController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const requestedQuery = req.query.q || req.query.query || "";
        const { normalizedQuery, candidates } = await userCache.getSearchCandidates(
            requestedQuery,
            loadSearchCandidateDtos
        );
        const snapshot = await userCache.getConnectionSnapshot(
            currentUserId,
            () => loadConnectionSnapshot(currentUserId)
        );
        const mapped = personalizeSearchCandidates({
            candidates,
            snapshot,
            currentUserId,
            isOnline: presenceService.isUserOnline,
            limit: normalizedQuery ? 20 : 15,
        });

        return res.status(200).json({ success: true, data: mapped });
    } catch (error) {
        console.error("searchUsers error:", error);
        return respondWithControllerError(res, error, "Failed to search users");
    }
};

/**
 * Send connection invitation request to a user
 * Body: { targetUserId }
 */
export const sendConnectionRequestController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const targetUserId = (req.body.targetUserId || req.body.userId || "").toString().trim();

        if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ success: false, message: "Valid Target User ID is required" });
        }

        if (currentUserId === targetUserId) {
            return res.status(400).json({ success: false, message: "Cannot send connection request to yourself" });
        }

        const [currentUser, targetUser] = await Promise.all([
            User.findById(currentUserId),
            User.findById(targetUserId),
        ]);

        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if already connected
        if (currentUser.contacts.some((id) => id.toString() === targetUserId)) {
            return res.status(400).json({ success: false, message: "Already connected with this user" });
        }

        // Check if request already sent
        const alreadySent = currentUser.sentRequests.some(
            (r) => r.to.toString() === targetUserId && r.status === "pending"
        );
        if (alreadySent) {
            return res.status(400).json({ success: false, message: "Connection request already pending" });
        }

        // Check if target user has sent a request to current user -> auto-accept
        const incomingIndex = currentUser.connectionRequests.findIndex(
            (r) => r.from.toString() === targetUserId && r.status === "pending"
        );

        if (incomingIndex > -1) {
            // Auto accept
            return acceptConnectionRequestController(req, res);
        }

        // Add to sentRequests of currentUser
        currentUser.sentRequests.push({
            to: targetUserId,
            status: "pending",
        });

        // Add to connectionRequests of targetUser
        targetUser.connectionRequests.push({
            from: currentUserId,
            status: "pending",
        });

        await userCache.runCoherentMutation({
            invalidate: () => userCache.invalidateRelationships([currentUserId, targetUserId]),
            mutate: () => Promise.all([currentUser.save(), targetUser.save()]),
        });

        return res.status(200).json({
            success: true,
            message: `Connection request sent to ${targetUser.name}`,
            status: "pending_sent",
            targetUserId,
        });
    } catch (error) {
        console.error("sendConnectionRequest error:", error);
        return respondWithControllerError(res, error, "Failed to send connection request");
    }
};

/**
 * Accept incoming connection invitation request
 * Body: { targetUserId }
 */
export const acceptConnectionRequestController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const targetUserId = (req.body.targetUserId || req.body.userId || "").toString().trim();

        if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ success: false, message: "Valid Target User ID is required" });
        }

        const [currentUser, targetUser] = await Promise.all([
            User.findById(currentUserId),
            User.findById(targetUserId),
        ]);

        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Target user not found" });
        }

        const room = await userCache.runCoherentMutation({
            invalidate: () => userCache.invalidateRelationships([currentUserId, targetUserId]),
            mutate: async () => {
                await Promise.all([
                    User.findByIdAndUpdate(currentUserId, {
                        $addToSet: { contacts: targetUserId },
                        $pull: {
                            connectionRequests: { from: targetUserId },
                            sentRequests: { to: targetUserId },
                        },
                    }),
                    User.findByIdAndUpdate(targetUserId, {
                        $addToSet: { contacts: currentUserId },
                        $pull: {
                            connectionRequests: { from: currentUserId },
                            sentRequests: { to: currentUserId },
                        },
                    }),
                ]);

                const directRoomName = `direct_${[currentUserId, targetUserId].sort().join("_")}`;
                let directRoom = await Room.findOne({ roomname: directRoomName });

                if (!directRoom) {
                    directRoom = await Room.create({
                        roomname: directRoomName,
                        description: `Direct chat between ${currentUser.name} and ${targetUser.name}`,
                        isDirect: true,
                        createdBy: currentUserId,
                        members: [currentUserId, targetUserId],
                    });
                } else {
                    let needsSave = false;
                    if (!directRoom.isDirect) {
                        directRoom.isDirect = true;
                        needsSave = true;
                    }
                    if (!directRoom.members || directRoom.members.length === 0) {
                        directRoom.members = [currentUserId, targetUserId];
                        needsSave = true;
                    }
                    if (needsSave) {
                        await directRoom.save();
                    }
                }

                return directRoom;
            },
        });
        return res.status(200).json({
            success: true,
            message: `Connected with ${targetUser.name}`,
            status: "connected",
            targetUserId,
            room: {
                id: room._id.toString(),
                _id: room._id.toString(),
                roomname: room.roomname,
                description: room.description,
                isDirect: true,
                contactUser: {
                    id: targetUser._id.toString(),
                    name: targetUser.name,
                    username: targetUser.username,
                    avatar: targetUser.avatar || "",
                },
            },
        });
    } catch (error) {
        console.error("acceptConnectionRequest error:", error);
        return respondWithControllerError(res, error, "Failed to accept connection request");
    }
};

/**
 * Reject incoming connection invitation request
 * Body: { targetUserId }
 */
export const rejectConnectionRequestController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const targetUserId = (req.body.targetUserId || req.body.userId || "").toString().trim();

        if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ success: false, message: "Valid Target User ID is required" });
        }

        const [currentUser, targetUser] = await Promise.all([
            User.findById(currentUserId),
            User.findById(targetUserId),
        ]);

        await userCache.runCoherentMutation({
            invalidate: () => userCache.invalidateRelationships([currentUserId, targetUserId]),
            mutate: async () => {
                if (currentUser) {
                    currentUser.connectionRequests = currentUser.connectionRequests.filter(
                        (request) => request.from.toString() !== targetUserId
                    );
                    currentUser.sentRequests = currentUser.sentRequests.filter(
                        (request) => request.to.toString() !== targetUserId
                    );
                    await currentUser.save();
                }

                if (targetUser) {
                    targetUser.connectionRequests = targetUser.connectionRequests.filter(
                        (request) => request.from.toString() !== currentUserId
                    );
                    targetUser.sentRequests = targetUser.sentRequests.filter(
                        (request) => request.to.toString() !== currentUserId
                    );
                    await targetUser.save();
                }
            },
        });

        return res.status(200).json({
            success: true,
            message: "Connection request removed",
            status: "none",
            targetUserId,
        });
    } catch (error) {
        console.error("rejectConnectionRequest error:", error);
        return respondWithControllerError(res, error, "Failed to reject connection request");
    }
};

/**
 * Get all connection data for current user (contacts, incoming pending, outgoing sent)
 */
export const getConnectionsController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const snapshot = await userCache.getConnectionSnapshot(
            currentUserId,
            () => loadConnectionSnapshot(currentUserId)
        );

        if (!snapshot) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            data: overlayConnectionPresence(snapshot, presenceService.isUserOnline),
        });
    } catch (error) {
        console.error("getConnections error:", error);
        return respondWithControllerError(res, error, "Failed to fetch connections");
    }
};
/**
 * Get current user profile details
 * GET /api/user/profile
 */
export const getProfileController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const user = await User.findById(currentUserId)
            .select("-password")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            data: {
                id: user._id.toString(),
                name: user.name,
                username: user.username,
                email: user.email,
                avatar: user.avatar || "",
                about: user.about || "",
                phone: user.phone || user.profile?.phone || "",
                profile: user.profile || {},
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("getProfile error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch profile" });
    }
};

/**
 * Update current user profile data
 * PUT /api/user/profile or PATCH /api/user/profile
 */
export const updateProfileController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const { name, username, about, avatar, phone, profile } = req.body;
        const updateFields = {};

        if (name && typeof name === "string" && name.trim()) {
            updateFields.name = name.trim();
        }
        if (username && typeof username === "string" && username.trim()) {
            const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
            const existing = await User.findOne({ username: cleanUsername, _id: { $ne: currentUserId } });
            if (existing) {
                return res.status(400).json({ success: false, message: "Username is already taken" });
            }
            updateFields.username = cleanUsername;
        }
        if (about !== undefined) {
            updateFields.about = typeof about === "string" ? about.trim() : "";
        }
        if (avatar !== undefined) {
            updateFields.avatar = typeof avatar === "string" ? avatar.trim() : "";
        }
        if (phone !== undefined) {
            updateFields.phone = typeof phone === "string" ? phone.trim() : "";
        }

        if (profile && typeof profile === "object") {
            Object.keys(profile).forEach((key) => {
                updateFields[`profile.${key}`] = profile[key];
            });
            if (profile.displayName) updateFields.name = profile.displayName.trim();
            if (profile.bio) updateFields.about = profile.bio.trim();
            if (profile.phone) updateFields.phone = profile.phone.trim();
        }

        const updatedUser = await userCache.runCoherentMutation({
            invalidate: () => userCache.invalidateDirectoryAndAuth([currentUserId]),
            mutate: async () => {
                const mutationFields = {};
                if (req.file?.buffer) {
                    const ext = (req.file.mimetype ? req.file.mimetype.split("/")[1] : "png").replace(/jpeg/, "jpg");
                    const fileName = `avatar_${currentUserId}_${Date.now()}.${ext}`;
                    const uploadResult = await uploadImage({
                        fileBuffer: req.file.buffer,
                        fileName,
                        folder: "/chatSocial/avatars",
                        tags: ["avatar", String(currentUserId)],
                    });
                    mutationFields.avatar = uploadResult.url;
                }
                Object.assign(mutationFields, updateFields);

                return User.findByIdAndUpdate(
                    currentUserId,
                    { $set: mutationFields },
                    { new: true, runValidators: true }
                ).select("-password").lean();
            },
            prime: async (user) => {
                if (user) await userCache.primeAuthProfile(user);
            },
        });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                id: updatedUser._id.toString(),
                name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email,
                avatar: updatedUser.avatar || "",
                about: updatedUser.about || "",
                phone: updatedUser.phone || updatedUser.profile?.phone || "",
                profile: updatedUser.profile || {},
                updatedAt: updatedUser.updatedAt,
            },
        });
    } catch (error) {
        console.error("updateProfile error:", error);
        return respondWithControllerError(res, error, "Failed to update profile");
    }
};

/**
 * Dedicated Avatar Image Upload Controller
 * POST /api/user/avatar or POST /api/users/avatar
 */
export const uploadAvatarController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: "No image file uploaded. Please provide an image file under the 'avatar' or 'image' field.",
            });
        }

        const ext = (req.file.mimetype ? req.file.mimetype.split("/")[1] : "png").replace(/jpeg/, "jpg");
        const fileName = `avatar_${currentUserId}_${Date.now()}.${ext}`;

        const updatedUser = await userCache.runCoherentMutation({
            invalidate: () => userCache.invalidateDirectoryAndAuth([currentUserId]),
            mutate: async () => {
                const uploadResult = await uploadImage({
                    fileBuffer: req.file.buffer,
                    fileName,
                    folder: "/chatSocial/avatars",
                    tags: ["avatar", String(currentUserId)],
                });

                return User.findByIdAndUpdate(
                    currentUserId,
                    { $set: { avatar: uploadResult.url } },
                    { new: true, runValidators: true }
                ).select("-password").lean();
            },
            prime: async (user) => {
                if (user) await userCache.primeAuthProfile(user);
            },
        });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Profile avatar uploaded successfully",
            avatar: updatedUser.avatar,
            data: {
                id: updatedUser._id.toString(),
                name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email,
                avatar: updatedUser.avatar,
                about: updatedUser.about || "",
                phone: updatedUser.phone || "",
                updatedAt: updatedUser.updatedAt,
            },
        });
    } catch (error) {
        console.error("uploadAvatar error:", error);
        return respondWithControllerError(res, error, "Failed to upload avatar to ImageKit");
    }
};

export default {
    searchUsersController,
    sendConnectionRequestController,
    acceptConnectionRequestController,
    rejectConnectionRequestController,
    getConnectionsController,
    getProfileController,
    updateProfileController,
    uploadAvatarController,
};
