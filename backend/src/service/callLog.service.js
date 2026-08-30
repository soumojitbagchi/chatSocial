import Call from "../model/call.model.js";
import mongoose from "mongoose";

export const recordCallLog = async ({
    callerId,
    receiverId,
    callId,
    type = "audio",
    status = "completed",
    duration = 0,
    startedAt = new Date(),
    endedAt = new Date(),
}) => {
    try {
        if (!callerId || !receiverId) return null;

        const validCaller = mongoose.Types.ObjectId.isValid(callerId) ? callerId : null;
        const validReceiver = mongoose.Types.ObjectId.isValid(receiverId) ? receiverId : null;

        if (!validCaller || !validReceiver) return null;

        const callRecord = await Call.create({
            caller: validCaller,
            receiver: validReceiver,
            callId: callId || `call_${Date.now()}`,
            type: type === "video" ? "video" : "audio",
            status,
            duration: Math.max(0, Math.round(duration)),
            startedAt: startedAt ? new Date(startedAt) : new Date(),
            endedAt: endedAt ? new Date(endedAt) : new Date(),
        });

        return callRecord;
    } catch (err) {
        console.warn("[callLogService] Failed to record call log:", err.message);
        return null;
    }
};

export const getUserCallLogs = async (userId) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return [];
    }

    const strUserId = userId.toString();

    const records = await Call.find({
        $or: [{ caller: userId }, { receiver: userId }],
    })
        .populate("caller", "name username avatar")
        .populate("receiver", "name username avatar")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

    return records.map((record) => {
        const isCaller = record.caller?._id ? record.caller._id.toString() === strUserId : record.caller?.toString() === strUserId;
        const otherUser = isCaller ? record.receiver : record.caller;

        let direction = "outgoing";
        if (!isCaller) {
            direction = record.status === "missed" || record.status === "rejected" ? "missed" : "incoming";
        }

        const durationSeconds = record.duration || 0;
        let formattedDuration = "0s";
        if (durationSeconds > 0) {
            const m = Math.floor(durationSeconds / 60);
            const s = durationSeconds % 60;
            formattedDuration = m === 0 ? `${s}s` : `${m}m ${s}s`;
        }

        const formattedTime = new Date(record.createdAt || record.startedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        return {
            id: record._id.toString(),
            callId: record.callId,
            name: otherUser?.name || otherUser?.username || "Contact",
            avatar: otherUser?.avatar || "",
            type: record.type || "audio",
            direction,
            status: record.status === "completed" ? "completed" : "missed",
            rawStatus: record.status,
            duration: formattedDuration,
            durationSeconds,
            time: formattedTime,
            createdAt: record.createdAt,
            otherUserId: otherUser?._id ? otherUser._id.toString() : "",
        };
    });
};

export const deleteCallLog = async (callRecordId, userId) => {
    if (!callRecordId || !userId) return false;
    const deleted = await Call.findOneAndDelete({
        _id: callRecordId,
        $or: [{ caller: userId }, { receiver: userId }],
    });
    return Boolean(deleted);
};

export const clearUserCallLogs = async (userId) => {
    if (!userId) return false;
    await Call.deleteMany({
        $or: [{ caller: userId }, { receiver: userId }],
    });
    return true;
};

export default {
    recordCallLog,
    getUserCallLogs,
    deleteCallLog,
    clearUserCallLogs,
};
