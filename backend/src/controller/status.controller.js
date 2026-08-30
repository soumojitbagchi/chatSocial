import * as statusService from "../service/status.service.js";

/**
 * Create a new status update (Photo, Video, or Text)
 * POST /api/status
 */
export const createStatusController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { caption, mediaType, backgroundColor, fontStyle } = req.body;
        const fileBuffer = req.file?.buffer || null;
        const fileName = req.file?.originalname || null;
        const mimetype = req.file?.mimetype || "";

        if (!fileBuffer && (!caption || !caption.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please upload an image/video or enter a caption text for your status",
            });
        }

        const status = await statusService.createStatus({
            userId: currentUserId,
            fileBuffer,
            fileName,
            mimetype,
            caption,
            mediaType,
            backgroundColor,
            fontStyle,
        });

        return res.status(201).json({
            success: true,
            message: "Status created successfully (valid for 24 hours)",
            data: status,
        });
    } catch (error) {
        console.error("createStatus error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create status update",
        });
    }
};

/**
 * Get active 24-hour statuses feed (My status + Contacts' statuses)
 * GET /api/status
 */
export const getStatusesFeedController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const feed = await statusService.getStatusesFeed(currentUserId);
        return res.status(200).json({
            success: true,
            data: feed,
        });
    } catch (error) {
        console.error("getStatusesFeed error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch status updates",
        });
    }
};

/**
 * Delete a status update
 * DELETE /api/status/:id
 */
export const deleteStatusController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const statusId = req.params.id;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await statusService.deleteStatus(statusId, currentUserId);
        return res.status(200).json({
            success: true,
            message: "Status update deleted successfully",
            data: result,
        });
    } catch (error) {
        const statusCode = error.message.includes("Unauthorized") ? 403 : error.message.includes("not found") ? 404 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to delete status",
        });
    }
};

/**
 * Mark a status as viewed
 * POST /api/status/:id/view
 */
export const viewStatusController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const statusId = req.params.id;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        await statusService.viewStatus(statusId, currentUserId);
        return res.status(200).json({
            success: true,
            message: "Status marked as viewed",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to mark status viewed",
        });
    }
};

/**
 * Reply to a status (WhatsApp-style direct chat reply with minimized preview card)
 * POST /api/status/:id/reply
 */
export const replyToStatusController = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?._id;
        const statusId = req.params.id;
        const replyText = req.body.replyText || req.body.text || req.body.message;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!replyText || !replyText.trim()) {
            return res.status(400).json({ success: false, message: "Reply text is required" });
        }

        const result = await statusService.replyToStatus({
            statusId,
            currentUserId,
            replyText,
        });

        return res.status(200).json({
            success: true,
            message: "Reply sent directly to conversation",
            data: result,
        });
    } catch (error) {
        console.error("replyToStatus error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to reply to status",
        });
    }
};

export default {
    createStatusController,
    getStatusesFeedController,
    deleteStatusController,
    viewStatusController,
    replyToStatusController,
};
