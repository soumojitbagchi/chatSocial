import * as presenceService from "../service/presence.service.js";

const presentHandler = (io, socket) => {
    const userId = String(socket.user?.id || socket.user?._id || socket.id);
    const username = socket.user?.username || socket.user?.name || "Anonymous";

    // Automatically record online presence upon connection if userId is known
    if (socket.user?.id || socket.user?._id) {
        const { isFirstSocket } = presenceService.addOnlineUser(userId, socket.id);
        if (isFirstSocket) {
            socket.broadcast.emit("user:online", { userId, username });
        }
        socket.emit("users:online-list", presenceService.getAllOnlineUserIds());
    }

    socket.on("online", (data = {}, callback) => {
        const { isFirstSocket } = presenceService.addOnlineUser(userId, socket.id);
        if (isFirstSocket) {
            socket.broadcast.emit("user:online", { userId, username });
        }
        const list = presenceService.getAllOnlineUserIds();
        socket.emit("users:online-list", list);
        if (typeof callback === "function") callback(list);
    });

    socket.on("getOnlineUsers", (callback) => {
        const list = presenceService.getAllOnlineUserIds();
        socket.emit("users:online-list", list);
        if (typeof callback === "function") callback(list);
    });

    socket.on("presence:sync", (callback) => {
        const list = presenceService.getAllOnlineUserIds();
        socket.emit("users:online-list", list);
        if (typeof callback === "function") callback(list);
    });
    socket.on("disconnect", () => {
        const { isLastSocket } = presenceService.removeOnlineUser(userId, socket.id);
        if (isLastSocket) {
            io.emit("user:offline", { userId, username });
        }
    });
};

export default presentHandler;
