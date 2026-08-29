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

            const mapped = await Promise.all(
                recentUsers.map(async (u) => {
                    const uIdStr = u._id.toString();
                    let connectionStatus = "none";
                    let roomId = null;

                    if (contactSet.has(uIdStr)) {
                        connectionStatus = "connected";
                        const directName = `direct_${[currentUserId, uIdStr].sort().join("_")}`;
                        const existingRoom = await Room.findOne({ roomname: directName }).select("_id").lean();
                        roomId = existingRoom ? existingRoom._id.toString() : null;
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
                })
            );

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

        const mapped = await Promise.all(
            matchingUsers.map(async (u) => {
                const uIdStr = u._id.toString();
                let connectionStatus = "none";
                let roomId = null;

                if (contactSet.has(uIdStr)) {
                    connectionStatus = "connected";
                    const directName = `direct_${[currentUserId, uIdStr].sort().join("_")}`;
                    const existingRoom = await Room.findOne({ roomname: directName }).select("_id").lean();
                    roomId = existingRoom ? existingRoom._id.toString() : null;
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
            })
        );

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

        // Add to contacts of both users if not already present
        if (!currentUser.contacts.some((id) => id.toString() === targetUserId)) {
            currentUser.contacts.push(targetUserId);
        }
        if (!targetUser.contacts.some((id) => id.toString() === currentUserId)) {
            targetUser.contacts.push(currentUserId);
        }

        // Update / remove pending requests
        currentUser.connectionRequests = currentUser.connectionRequests.filter(
            (r) => r.from.toString() !== targetUserId
        );
        currentUser.sentRequests = currentUser.sentRequests.filter(
            (r) => r.to.toString() !== targetUserId
        );

        targetUser.connectionRequests = targetUser.connectionRequests.filter(
            (r) => r.from.toString() !== currentUserId
        );
        targetUser.sentRequests = targetUser.sentRequests.filter(
            (r) => r.to.toString() !== currentUserId
        );

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
        }

        await Promise.all([currentUser.save(), targetUser.save()]);

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

export default {
    searchUsersController,
    sendConnectionRequestController,
    acceptConnectionRequestController,
    rejectConnectionRequestController,
    getConnectionsController,
};
