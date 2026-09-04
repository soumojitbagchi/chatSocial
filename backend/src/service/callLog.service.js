import Call from "../model/call.model.js";
import mongoose from "mongoose";

// Statuses that land a call in the receiver's Missed section.
export const MISSED_STATUSES = ["missed", "rejected", "busy", "failed"];

const isMissedStatus = (status) => MISSED_STATUSES.includes(status);

const seenByContains = (seenBy, userIdStr) => (
    Array.isArray(seenBy) && seenBy.some((id) => id?.toString() === userIdStr)
);

const formatDuration = (durationSeconds) => {
    const total = Math.max(0, Math.round(durationSeconds || 0));
    if (total <= 0) return "0s";
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m === 0 ? `${s}s` : `${m}m ${s}s`;
};

const formatTime = (value) => (
    new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
);

/**
 * Pure mapper: Mongo record (populated or raw) -> client history DTO.
 * Exported for unit testing; has no DB access.
 */
export const toCallHistoryDto = (record, userId) => {
    const strUserId = userId?.toString() || "";
    const callerId = record.caller?._id ? record.caller._id.toString() : record.caller?.toString();
    const isCaller = callerId === strUserId;
    const otherUser = isCaller ? record.receiver : record.caller;

    const missed = !isCaller && isMissedStatus(record.status);
    const direction = isCaller ? "outgoing" : (missed ? "missed" : "incoming");

    // Only missed calls can be "unseen" (red). Completed/outgoing are
    // always treated as seen. Missing seenBy (old docs) => unseen.
    const seen = missed ? seenByContains(record.seenBy, strUserId) : true;

    const durationSeconds = Math.max(0, Math.round(record.duration || 0));

    return {
        id: record._id.toString(),
        callId: record.callId,
        name: otherUser?.name || otherUser?.username || "Contact",
        avatar: otherUser?.avatar || "",
        type: record.type || "audio",
        direction,
        status: record.status === "completed" ? "completed" : "missed",
        rawStatus: record.status,
        duration: formatDuration(durationSeconds),
        durationSeconds,
        time: formatTime(record.createdAt || record.startedAt),
        createdAt: record.createdAt,
        otherUserId: otherUser?._id ? otherUser._id.toString() : "",
        seen,
        isMissed: missed,
    };
};

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

        // The caller always "sees" their own log entry.
        const callRecord = await Call.create({
            caller: validCaller,
            receiver: validReceiver,
            callId: callId || `call_${Date.now()}`,
            type: type === "video" ? "video" : "audio",
            status,
            duration: Math.max(0, Math.round(duration)),
            seenBy: [validCaller],
            startedAt: startedAt ? new Date(startedAt) : new Date(),
            endedAt: endedAt ? new Date(endedAt) : new Date(),
        });

        return callRecord;
    } catch (err) {
        console.warn("[callLogService] Failed to record call log:", err.message);
        return null;
    }
};

/**
 * Section-aware history.
 * - section "missed": calls I received with a non-completed status.
 * - section "all" (default): every call I'm part of.
 */
export const getCallHistory = async (userId, { section = "all", limit = 100 } = {}) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return [];
    }

    const query = section === "missed"
        ? { receiver: userId, status: { $in: MISSED_STATUSES } }
        : { $or: [{ caller: userId }, { receiver: userId }] };

    const records = await Call.find(query)
        .populate("caller", "name username avatar")
        .populate("receiver", "name username avatar")
        .sort({ createdAt: -1 })
        .limit(Math.min(Math.max(limit, 1), 200))
        .lean();

    return records.map((record) => toCallHistoryDto(record, userId));
};

// Backwards-compatible alias: full history for a user.
export const getUserCallLogs = async (userId) => getCallHistory(userId, { section: "all" });

// Missed-only section for a user.
export const getMissedCalls = async (userId, options) => (
    getCallHistory(userId, { ...options, section: "missed" })
);

export const getUnseenMissedCount = async (userId) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return 0;
    }
    return Call.countDocuments({
        receiver: userId,
        status: { $in: MISSED_STATUSES },
        seenBy: { $ne: userId },
    });
};

/**
 * Mark missed calls as seen for a user.
 * ids omitted/empty => all unseen missed. Returns { matched, modified }.
 */
export const markMissedSeen = async (userId, ids = null) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return { matched: 0, modified: 0 };
    }

    const filter = {
        receiver: userId,
        status: { $in: MISSED_STATUSES },
        seenBy: { $ne: userId },
    };

    if (Array.isArray(ids) && ids.length > 0) {
        const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length === 0) return { matched: 0, modified: 0 };
        filter._id = { $in: validIds };
    }

    const result = await Call.updateMany(filter, { $addToSet: { seenBy: userId } });
    return {
        matched: result.matchedCount ?? 0,
        modified: result.modifiedCount ?? 0,
    };
};

export const deleteCallLog = async (callRecordId, userId) => {
    if (!callRecordId || !userId) return false;
    const deleted = await Call.findOneAndDelete({
        _id: callRecordId,
        $or: [{ caller: userId }, { receiver: userId }],
    });
    return Boolean(deleted);
};

export const clearUserCallLogs = async (userId, { section = "all" } = {}) => {
    if (!userId) return false;
    if (section === "missed") {
        await Call.deleteMany({ receiver: userId, status: { $in: MISSED_STATUSES } });
    } else {
        await Call.deleteMany({ $or: [{ caller: userId }, { receiver: userId }] });
    }
    return true;
};

export default {
    MISSED_STATUSES,
    toCallHistoryDto,
    recordCallLog,
    getCallHistory,
    getUserCallLogs,
    getMissedCalls,
    getUnseenMissedCount,
    markMissedSeen,
    deleteCallLog,
    clearUserCallLogs,
};
