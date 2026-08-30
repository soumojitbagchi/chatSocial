import * as callLogService from "../service/callLog.service.js";

export const getCallLogsController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const callLogs = await callLogService.getUserCallLogs(currentUserId);
        return res.status(200).json({
            success: true,
            data: callLogs,
        });
    } catch (error) {
        console.error("[callController] getCallLogs error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch call history",
        });
    }
};

export const deleteCallLogController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
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
        const currentUserId = req.user?.id || req.user?._id;
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        await callLogService.clearUserCallLogs(currentUserId);
        return res.status(200).json({
            success: true,
            message: "Call history cleared",
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
    getCallLogsController,
    deleteCallLogController,
    clearCallLogsController,
};
