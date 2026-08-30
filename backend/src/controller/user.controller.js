import User from "../model/user.model.js";
import Room from "../model/room.model.js";
import mongoose from "mongoose";
import * as presenceService from "../sockets/service/presence.service.js";

/**
 * Search registered users by username, full name, or email
 * Query param: ?q=searchQuery
 */
export const searchUsersController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const query = (req.query.q || req.query.query || "").toString().trim();

        if (!query) {
            // Return top 15 registered users excluding current user
            const recentUsers = await User.find({ _id: { $ne: currentUserId } })
                .select("name username email avatar about contacts connectionRequests sentRequests")
                .limit(15)
                .lean();

            const currentUser = await User.findById(currentUserId).lean();
            const contactSet = new Set((currentUser?.contacts || []).map((id) => id.toString()));
            const sentPendingSet = new Set(
                (currentUser?.sentRequests || [])
                    .filter((r) => r.status === "pending")
                    .map((r) => r.to.toString())
            );
            const receivedPendingSet = new Set(
                (currentUser?.connectionRequests || [])
                    .filter((r) => r.status === "pending")
                    .map((r) => r.from.toString())
            );
            const directRoomNames = recentUsers.map((u) => `direct_${[currentUserId, u._id.toString()].sort().join("_")}`);
            const existingRooms = await Room.find({ roomname: { $in: directRoomNames } }).select("_id roomname").lean();
            const roomMap = new Map(existingRooms.map((r) => [r.roomname, r._id.toString()]));

            const mapped = recentUsers.map((u) => {
                const uIdStr = u._id.toString();
                let connectionStatus = "none";
                let roomId = null;
                const directName = `direct_${[currentUserId, uIdStr].sort().join("_")}`;

                if (contactSet.has(uIdStr)) {
                    connectionStatus = "connected";
                    roomId = roomMap.get(directName) || null;
                } else if (sentPendingSet.has(uIdStr)) {
                    connectionStatus = "pending_sent";
                } else if (receivedPendingSet.has(uIdStr)) {
                    connectionStatus = "pending_received";
                }

                return {
                    id: u._id.toString(),
                    name: u.name,
                    username: u.username,
                    email: u.email,
                    avatar: u.avatar || "",
                    about: u.about || "Hey there! I am using chatSocial.",
                    connectionStatus,
                    roomId,
                    online: presenceService.isUserOnline(u._id.toString()),
                };
            });

            return res.status(200).json({ success: true, data: mapped });
        }

        const regex = new RegExp(query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");

        const matchingUsers = await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { username: regex },
                { name: regex },
                { email: regex },
            ],
        })
            .select("name username email avatar about contacts connectionRequests sentRequests")
            .limit(20)
            .lean();

        const currentUser = await User.findById(currentUserId).lean();
        const contactSet = new Set((currentUser?.contacts || []).map((id) => id.toString()));
        const sentPendingSet = new Set(
            (currentUser?.sentRequests || [])
                .filter((r) => r.status === "pending")
                .map((r) => r.to.toString())
        );
        const receivedPendingSet = new Set(
            (currentUser?.connectionRequests || [])
                .filter((r) => r.status === "pending")
                .map((r) => r.from.toString())
        );
        const directRoomNames = matchingUsers.map((u) => `direct_${[currentUserId, u._id.toString()].sort().join("_")}`);
        const existingRooms = await Room.find({ roomname: { $in: directRoomNames } }).select("_id roomname").lean();
        const roomMap = new Map(existingRooms.map((r) => [r.roomname, r._id.toString()]));

        const mapped = matchingUsers.map((u) => {
            const uIdStr = u._id.toString();
            let connectionStatus = "none";
            let roomId = null;
            const directName = `direct_${[currentUserId, uIdStr].sort().join("_")}`;

            if (contactSet.has(uIdStr)) {
                connectionStatus = "connected";
                roomId = roomMap.get(directName) || null;
            } else if (sentPendingSet.has(uIdStr)) {
                connectionStatus = "pending_sent";
            } else if (receivedPendingSet.has(uIdStr)) {
                connectionStatus = "pending_received";
            }

            return {
                id: u._id.toString(),
                name: u.name,
                username: u.username,
                email: u.email,
                avatar: u.avatar || "",
                about: u.about || "Hey there! I am using chatSocial.",
                connectionStatus,
                roomId,
                online: presenceService.isUserOnline(u._id.toString()),
            };
        });

        return res.status(200).json({ success: true, data: mapped });
    } catch (error) {
        console.error("searchUsers error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to search users" });
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

        await Promise.all([currentUser.save(), targetUser.save()]);

        return res.status(200).json({
            success: true,
            message: `Connection request sent to ${targetUser.name}`,
            status: "pending_sent",
            targetUserId,
        });
    } catch (error) {
        console.error("sendConnectionRequest error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to send connection request" });
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

        // Find or create direct 1-to-1 room in MongoDB
        const directRoomName = `direct_${[currentUserId, targetUserId].sort().join("_")}`;
        let room = await Room.findOne({ roomname: directRoomName });

        if (!room) {
            room = await Room.create({
                roomname: directRoomName,
                description: `Direct chat between ${currentUser.name} and ${targetUser.name}`,
                isDirect: true,
                createdBy: currentUserId,
                members: [currentUserId, targetUserId],
            });
        } else {
            // Backfill members if the room was created without them
            let needsSave = false;
            if (!room.isDirect) {
                room.isDirect = true;
                needsSave = true;
            }
            if (!room.members || room.members.length === 0) {
                room.members = [currentUserId, targetUserId];
                needsSave = true;
            }
            if (needsSave) {
                await room.save();
            }
        }
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
        return res.status(500).json({ success: false, message: error.message || "Failed to accept connection request" });
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

        if (currentUser) {
            currentUser.connectionRequests = currentUser.connectionRequests.filter(
                (r) => r.from.toString() !== targetUserId
            );
            currentUser.sentRequests = currentUser.sentRequests.filter(
                (r) => r.to.toString() !== targetUserId
            );
            await currentUser.save();
        }

        if (targetUser) {
            targetUser.connectionRequests = targetUser.connectionRequests.filter(
                (r) => r.from.toString() !== currentUserId
            );
            targetUser.sentRequests = targetUser.sentRequests.filter(
                (r) => r.to.toString() !== currentUserId
            );
            await targetUser.save();
        }

        return res.status(200).json({
            success: true,
            message: "Connection request removed",
            status: "none",
            targetUserId,
        });
    } catch (error) {
        console.error("rejectConnectionRequest error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to reject connection request" });
    }
};

/**
 * Get all connection data for current user (contacts, incoming pending, outgoing sent)
 */
export const getConnectionsController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const currentUser = await User.findById(currentUserId)
            .populate("contacts", "name username email avatar about lastSeen")
            .populate("connectionRequests.from", "name username email avatar about")
            .populate("sentRequests.to", "name username email avatar about")
            .lean();

        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const contactsWithRooms = await Promise.all(
            (currentUser.contacts || []).map(async (c) => {
                const cIdStr = c._id.toString();
                const directName = `direct_${[currentUserId, cIdStr].sort().join("_")}`;
                const directRoom = await Room.findOne({ roomname: directName }).select("_id").lean();
                return {
                    id: c._id.toString(),
                    name: c.name,
                    username: c.username,
                    email: c.email,
                    avatar: c.avatar || "",
                    about: c.about || "",
                    online: presenceService.isUserOnline(cIdStr),
                    roomId: directRoom ? directRoom._id.toString() : null,
                };
            })
        );

        const pendingIncoming = (currentUser.connectionRequests || [])
            .filter((r) => r.status === "pending" && r.from)
            .map((r) => ({
                id: r.from._id.toString(),
                name: r.from.name,
                username: r.from.username,
                email: r.from.email,
                avatar: r.from.avatar || "",
                about: r.from.about || "",
                requestedAt: r.createdAt,
            }));

        const pendingOutgoing = (currentUser.sentRequests || [])
            .filter((r) => r.status === "pending" && r.to)
            .map((r) => ({
                id: r.to._id.toString(),
                name: r.to.name,
                username: r.to.username,
                email: r.to.email,
                avatar: r.to.avatar || "",
                about: r.to.about || "",
                requestedAt: r.createdAt,
            }));

        return res.status(200).json({
            success: true,
            data: {
                contacts: contactsWithRooms,
                pendingIncoming,
                pendingOutgoing,
            },
        });
    } catch (error) {
        console.error("getConnections error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch connections" });
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

        const updatedUser = await User.findByIdAndUpdate(
            currentUserId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select("-password").lean();

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
        return res.status(500).json({ success: false, message: error.message || "Failed to update profile" });
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
};
