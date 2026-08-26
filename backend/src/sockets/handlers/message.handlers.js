import * as messageService from "../../service/message.service.js";

const parsePayload = (data) => {
    if (typeof data === "string") {
        try {
            return JSON.parse(data);
        } catch {
            return { text: data, message: data, roomId: data };
        }
    }
    return data || {};
};

const messageHandlers = (io, socket) => {
    const currentUserId = socket.user?.id || socket.user?._id?.toString() || socket.id;

    // Send message
    socket.on("sendMessage", async (data = {}) => {
        try {
            const payload = parsePayload(data);
            const roomId = payload.roomId?.toString?.() || payload.roomId;
            const content = payload.text ?? payload.message;

            if (!roomId || !content) {
                return socket.emit("message:error", { message: "Room ID and message content are required" });
            }

            // Ensure socket is joined to the room
            socket.join(roomId);

            const savedMessage = await messageService.createMessage({
                userId: currentUserId,
                roomId,
                text: content,
            });

            io.to(roomId).emit("receiveMessage", savedMessage);
        } catch (error) {
            console.error("Error in sendMessage:", error.message);
            socket.emit("message:error", { message: error.message || "Failed to send message" });
        }
    });

    // Edit message
    socket.on("editMessage", async (data = {}) => {
        try {
            const payload = parsePayload(data);
            const messageId = payload.messageId || payload.id || payload._id;
            const content = payload.newMessage ?? payload.text;

            if (!messageId || !content) {
                return socket.emit("message:error", { message: "Message ID and new message content are required" });
            }

            const updatedMessage = await messageService.updateMessage({
                messageId,
                userId: currentUserId,
                text: content,
            });

            const roomId = updatedMessage.roomId.toString();
            io.to(roomId).emit("messageUpdated", updatedMessage);
        } catch (error) {
            console.error("Error in editMessage:", error.message);
            socket.emit("message:error", { message: error.message || "Failed to edit message" });
        }
    });

    // Delete message (soft delete)
    socket.on("deleteMessage", async (data = {}) => {
        try {
            const payload = parsePayload(data);
            const messageId = payload.messageId || payload.id || payload._id;

            if (!messageId) {
                return socket.emit("message:error", { message: "Message ID is required" });
            }

            const deletedMessage = await messageService.deleteMessage({
                messageId,
                userId: currentUserId,
            });

            const roomId = deletedMessage.roomId.toString();
            io.to(roomId).emit("messageDeleted", {
                messageId,
                roomId,
                message: deletedMessage,
            });
        } catch (error) {
            console.error("Error in deleteMessage:", error.message);
            socket.emit("message:error", { message: error.message || "Failed to delete message" });
        }
    });

    // Fetch message history for a room
    socket.on("getMessages", async (data = {}) => {
        try {
            const payload = parsePayload(data);
            const roomId = payload.roomId?.toString?.() || (typeof data === "string" ? data : null);
            const limit = payload.limit;
            const page = payload.page;

            if (!roomId) {
                return socket.emit("message:error", { message: "Room ID is required" });
            }

            const messages = await messageService.getAllMessages({ roomId, limit, page });
            socket.emit("messages:list", { roomId, messages });
        } catch (error) {
            console.error("Error in getMessages:", error.message);
            socket.emit("message:error", { message: error.message || "Failed to fetch messages" });
        }
    });
};

export default messageHandlers;
