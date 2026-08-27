import * as presenceService from "../service/presence.service.js";

const presentHandler = (io, socket) => {
    const userId = socket.user?.id || socket.user?._id?.toString() || socket.id;
    const username = socket.user?.username || socket.user?.name || "Anonymous";

    socket.on("online", () => {
        const { isFirstSocket } = presenceService.addOnlineUser(userId, socket.id);
        if (isFirstSocket) {
            socket.broadcast.emit("user:online", { userId, username });
        }
        socket.emit("users:online-list", presenceService.getAllOnlineUserIds());
    });

    socket.on("disconnect", () => {
        const { isLastSocket } = presenceService.removeOnlineUser(userId, socket.id);
        if (isLastSocket) {
            io.emit("user:offline", { userId, username });
        }
    });
};

export default presentHandler;
