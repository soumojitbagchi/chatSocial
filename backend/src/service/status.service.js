import Status from "../model/status.model.js";
import User from "../model/user.model.js";
import Room from "../model/room.model.js";
import { uploadImage, deleteImage } from "./imagekit.service.js";
import * as messageService from "./message.service.js";
import mongoose from "mongoose";

/**
 * Create a new 24-hour status story
 */
export const createStatus = async ({
    userId,
    fileBuffer,
    fileName,
    mimetype = "",
    caption = "",
    mediaType = null,
    backgroundColor = "#12151b",
    fontStyle = "sans-serif",
}) => {
    if (!userId) {
        throw new Error("User ID is required to create a status");
    }

    let resolvedMediaType = mediaType || "text";
    let mediaUrl = "";
    let fileId = null;

    // 1. If file buffer exists, auto-detect media type and upload to ImageKit
    if (fileBuffer && Buffer.isBuffer(fileBuffer)) {
        const lowerMime = (mimetype || "").toLowerCase();
        if (lowerMime.startsWith("video/")) {
            resolvedMediaType = "video";
        } else {
            resolvedMediaType = "image";
        }

        const ext = (lowerMime ? lowerMime.split("/")[1] : "png").replace(/jpeg/, "jpg").split("+")[0];
        const cleanFileName = `story_${userId}_${Date.now()}.${ext}`;

        const uploadResult = await uploadImage({
            fileBuffer,
            fileName: cleanFileName,
            folder: "/chatSocial/stories",
            tags: ["story", "status", String(userId)],
        });

        mediaUrl = uploadResult.url;
        fileId = uploadResult.fileId;
    } else if (caption && !mediaUrl) {
        resolvedMediaType = "text";
    }

    // 2. Set strict 24-hour expiry
    const now = Date.now();
    const expiresAt = new Date(now + 24 * 60 * 60 * 1000);

    const statusDoc = await Status.create({
        userId,
        mediaUrl,
        fileId,
        mediaType: resolvedMediaType,
        caption: typeof caption === "string" ? caption.trim() : "",
        backgroundColor: backgroundColor || "#12151b",
        fontStyle: fontStyle || "sans-serif",
        expiresAt,
        viewers: [],
    });

    const populated = await Status.findById(statusDoc._id)
        .populate("userId", "name username avatar")
        .lean();

    return populated;
};

/**
 * Get active 24-hour status feed grouped by user (My status + Contacts' statuses)
 */
export const getStatusesFeed = async (currentUserId) => {
    if (!currentUserId) {
        return { myStatus: null, recentUpdates: [], viewedUpdates: [] };
    }

    const strUserId = currentUserId.toString();
    const now = new Date();

    // 1. Fetch current user to determine authorized contact relationships
    const currentUser = await User.findById(currentUserId)
        .select("contacts name username avatar")
        .lean();

    const contactIds = (currentUser?.contacts || []).map((id) => id.toString());
    const queryUserIds = [strUserId, ...contactIds];

    // 2. Query only unexpired stories (created within last 24h)
    const activeStatuses = await Status.find({
        userId: { $in: queryUserIds },
        expiresAt: { $gt: now },
    })
        .populate("userId", "name username avatar about")
        .populate("viewers.userId", "name username avatar")
        .sort({ createdAt: 1 })
        .lean();

    // 3. Group stories by user
    const userGroupsMap = new Map();

    activeStatuses.forEach((status) => {
        const u = status.userId;
        if (!u) return;

        const uId = u._id ? u._id.toString() : u.toString();
        const isMe = uId === strUserId;

        if (!userGroupsMap.has(uId)) {
            userGroupsMap.set(uId, {
                userId: uId,
                userName: isMe ? "My Status" : (u.name || u.username || "User"),
                userFullName: u.name || u.username || "User",
                avatar: u.avatar || "",
                isMe,
                stories: [],
                allViewed: true,
                lastUpdated: status.createdAt,
            });
        }

        const group = userGroupsMap.get(uId);
        const viewedByMe = isMe || (Array.isArray(status.viewers) && status.viewers.some((v) => {
            const vId = v.userId && typeof v.userId === "object" ? v.userId._id?.toString() : v.userId?.toString();
            return vId === strUserId;
        }));

        if (!viewedByMe && !isMe) {
            group.allViewed = false;
        }

        const formattedTime = new Date(status.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const timeAgo = formatTimeAgo(status.createdAt);

        group.lastUpdated = status.createdAt;
        group.stories.push({
            id: status._id.toString(),
            mediaUrl: status.mediaUrl,
            mediaType: status.mediaType,
            caption: status.caption,
            backgroundColor: status.backgroundColor,
            fontStyle: status.fontStyle,
            createdAt: status.createdAt,
            expiresAt: status.expiresAt,
            time: formattedTime,
            timeAgo,
            viewedByMe,
            viewersCount: Array.isArray(status.viewers) ? status.viewers.length : 0,
            viewers: isMe ? (status.viewers || []).map((v) => ({
                id: v.userId?._id ? v.userId._id.toString() : v.userId?.toString() || "",
                name: v.userId?.name || "Contact",
                avatar: v.userId?.avatar || "",
                viewedAt: v.viewedAt,
            })) : [],
        });
    });

    let myStatus = userGroupsMap.get(strUserId) || null;
    if (!myStatus && currentUser) {
        myStatus = {
            userId: strUserId,
            userName: "My Status",
            userFullName: currentUser.name || "You",
            avatar: currentUser.avatar || "",
            isMe: true,
            stories: [],
            allViewed: true,
            lastUpdated: null,
        };
    }

    const recentUpdates = [];
    const viewedUpdates = [];

    userGroupsMap.forEach((group, uId) => {
        if (uId === strUserId) return;
        if (group.allViewed) {
            viewedUpdates.push(group);
        } else {
            recentUpdates.push(group);
        }
    });

    // Sort by latest update descending
    recentUpdates.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    viewedUpdates.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

    return {
        myStatus,
        recentUpdates,
        viewedUpdates,
        totalActive: activeStatuses.length,
    };
};

/**
 * Delete a status story by ID (owner only)
 */
export const deleteStatus = async (statusId, currentUserId) => {
    if (!statusId || !currentUserId) {
        throw new Error("Status ID and User ID are required");
    }

    const status = await Status.findById(statusId);
    if (!status) {
        throw new Error("Status not found or has already expired");
    }

    if (status.userId.toString() !== currentUserId.toString()) {
        throw new Error("Unauthorized: You can only delete your own status updates");
    }

    // Delete asset from ImageKit cloud storage if fileId is present
    if (status.fileId) {
        await deleteImage(status.fileId).catch(() => {});
    }

    await Status.findByIdAndDelete(statusId);
    return { success: true, deletedId: statusId };
};

/**
 * Mark a status story as viewed by current user
 */
export const viewStatus = async (statusId, currentUserId) => {
    if (!statusId || !currentUserId) {
        throw new Error("Status ID and User ID are required");
    }

    const status = await Status.findById(statusId);
    if (!status) {
        return null;
    }

    const alreadyViewed = (status.viewers || []).some(
        (v) => v.userId && v.userId.toString() === currentUserId.toString()
    );

    if (!alreadyViewed && status.userId.toString() !== currentUserId.toString()) {
        status.viewers.push({
            userId: currentUserId,
            viewedAt: new Date(),
        });
        await status.save();
    }

    return status;
};

/**
 * Reply to a status story (WhatsApp-style direct chat reply with minimized story preview card)
 */
export const replyToStatus = async ({ statusId, currentUserId, replyText }) => {
    const text = typeof replyText === "string" ? replyText.trim() : "";
    if (!statusId || !currentUserId || !text) {
        throw new Error("Status ID, User ID, and reply text are required");
    }

    const status = await Status.findById(statusId).populate("userId", "name username avatar");
    if (!status) {
        throw new Error("Status update not found or has already expired");
    }

    const storyOwner = status.userId;
    const storyOwnerId = storyOwner._id ? storyOwner._id.toString() : storyOwner.toString();
    const strCurrentUserId = currentUserId.toString();

    // Find or create direct 1-to-1 conversation room between viewer and status owner
    const directRoomName = `direct_${[strCurrentUserId, storyOwnerId].sort().join("_")}`;
    let room = await Room.findOne({ roomname: directRoomName });

    if (!room) {
        room = await Room.create({
            roomname: directRoomName,
            description: `Direct conversation between ${storyOwner.name || "User"} and Contact`,
            isDirect: true,
            createdBy: currentUserId,
            members: [currentUserId, storyOwnerId],
        });
    } else if (!room.members || room.members.length < 2) {
        room.members = [currentUserId, storyOwnerId];
        room.isDirect = true;
        await room.save();
    }

    const roomId = room._id.toString();

    // Create message with 'story-reply' type and minimized story preview metadata
    const storyTime = new Date(status.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const messageMeta = {
        storyReply: {
            statusId: status._id.toString(),
            mediaUrl: status.mediaUrl || "",
            mediaType: status.mediaType,
            caption: status.caption || "",
            backgroundColor: status.backgroundColor,
            storyOwnerName: storyOwner.name || storyOwner.username || "User",
            storyOwnerId,
            time: storyTime,
        },
    };

    const savedMessage = await messageService.createMessage({
        userId: currentUserId,
        roomId,
        text,
        type: "story-reply",
        meta: messageMeta,
    });

    return {
        message: savedMessage,
        roomId,
        storyOwnerId,
    };
};

/**
 * Format relative time ago string
 */
function formatTimeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return "1d ago";
}

export default {
    createStatus,
    getStatusesFeed,
    deleteStatus,
    viewStatus,
    replyToStatus,
};
