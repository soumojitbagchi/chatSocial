import * as callLogService from "../service/callLog.service.js";

const getCurrentUserId = (req) => req.user?.id || req.user?._id || null;

// GET /calls?section=all|missed -> { data, meta: { unseenMissedCount } }
export const getCallHistoryController = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const section = req.query?.section === "missed" ? "missed" : "all";
        const [callLogs, unseenMissedCount] = await Promise.all([
            callLogService.getCallHistory(currentUserId, { section }),
            callLogService.getUnseenMissedCount(currentUserId),
        ]);

        return res.status(200).json({
            success: true,
            data: callLogs,
            meta: { section, unseenMissedCount },
        });
    } catch (error) {
        console.error("[callController] getCallHistory error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch call history",
        });
    }
};

// Backwards-compatible alias for GET / (old clients ignore meta).
export const getCallLogsController = getCallHistoryController;

// GET /calls/missed -> missed section only.
export const getMissedCallsController = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const [callLogs, unseenMissedCount] = await Promise.all([
            callLogService.getMissedCalls(currentUserId),
            callLogService.getUnseenMissedCount(currentUserId),
        ]);

        return res.status(200).json({
            success: true,
            data: callLogs,
            meta: { section: "missed", unseenMissedCount },
        });
    } catch (error) {
        console.error("[callController] getMissedCalls error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch missed calls",
        });
    }
};

// GET /calls/unseen-count -> { data: { unseenMissedCount } }
export const getUnseenMissedCountController = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const unseenMissedCount = await callLogService.getUnseenMissedCount(currentUserId);
        return res.status(200).json({ success: true, data: { unseenMissedCount } });
    } catch (error) {
        console.error("[callController] getUnseenMissedCount error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch unseen missed count",
        });
    }
};

// PATCH /calls/seen { ids?: string[] } -> marks missed as seen.
export const markMissedSeenController = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
        const result = await callLogService.markMissedSeen(currentUserId, ids);
        const unseenMissedCount = await callLogService.getUnseenMissedCount(currentUserId);

        return res.status(200).json({ success: true, data: { ...result, unseenMissedCount } });
    } catch (error) {
        console.error("[callController] markMissedSeen error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to mark missed calls as seen",
        });
    }
};

export const deleteCallLogController = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const callRecordId = req.params.id;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const success = await callLogService.deleteCallLog(callRecordId, currentUserId);
        return res.status(200).json({
            success,
            message: success ? "Call log deleted" : "Call record not found",
        });
    } catch (error) {
        console.error("[callController] deleteCallLog error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete call log",
        });
    }
};

export const clearCallLogsController = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const section = req.query?.section === "missed" ? "missed" : "all";
        await callLogService.clearUserCallLogs(currentUserId, { section });
        return res.status(200).json({
            success: true,
            message: section === "missed" ? "Missed calls cleared" : "Call history cleared",
        });
    } catch (error) {
        console.error("[callController] clearCallLogs error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to clear call history",
        });
    }
};

export default {
    getCallHistoryController,
    getCallLogsController,
    getMissedCallsController,
    getUnseenMissedCountController,
    markMissedSeenController,
    deleteCallLogController,
    clearCallLogsController,
};
