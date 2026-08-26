import * as roomService from "../../service/room.service.js";

// Helper to normalize inputs (objects, JSON strings, or plain string IDs)
const normalizePayload = (data) => {
  if (typeof data === "string") {
    const trimmed = data.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      return { roomId: trimmed, roomname: trimmed };
    }
  }
  return data || {};
};

// Tracks roomId -> Map<userId, Set<socketId>>
const roomMembers = new Map();

const roomHandler = (io, socket) => {
  const userId = socket.user?.id || socket.user?._id?.toString() || socket.id;
  const username = socket.user?.username || socket.user?.name || "Anonymous";

  socket.on("create-room", async (data = {}) => {
    try {
      const payload = normalizePayload(data);
      const roomname = payload.roomname;
      const description = payload.description || "";

      if (!roomname || !roomname.trim()) {
        return socket.emit("room:error", { message: "Room name is required" });
      }

      const room = await roomService.createRoom({
        roomname: roomname.trim(),
        description: description || "",
        createdBy: userId,
      });

      const roomId = room._id.toString();

      if (!roomMembers.has(roomId)) {
        roomMembers.set(roomId, new Map());
      }
      const usersInRoom = roomMembers.get(roomId);
      if (!usersInRoom.has(userId)) {
        usersInRoom.set(userId, new Set());
      }
      usersInRoom.get(userId).add(socket.id);

      socket.join(roomId);

      socket.emit("room:created", {
        success: true,
        roomId,
        roomname: room.roomname,
        description: room.description,
        createdBy: room.createdBy,
      });

      const count = io.engine.clientsCount;
      console.log(`Number of connected clients: ${count}`);
    } catch (error) {
      socket.emit("room:error", { message: error.message || "Failed to create room" });
    }
  });

  socket.on("join-room", async (data = {}) => {
    try {
      const payload = normalizePayload(data);
      const roomId = payload.roomId || (typeof data === "string" ? data.trim() : null);

      if (!roomId) {
        return socket.emit("room:error", { message: "Room ID is required" });
      }

      const room = await roomService.getRoom(roomId);
      const stringRoomId = room._id.toString();

      if (!roomMembers.has(stringRoomId)) {
        roomMembers.set(stringRoomId, new Map());
      }
      const usersInRoom = roomMembers.get(stringRoomId);
      const isFirstSocketForUser = !usersInRoom.has(userId) || usersInRoom.get(userId).size === 0;

      if (!usersInRoom.has(userId)) {
        usersInRoom.set(userId, new Set());
      }
      usersInRoom.get(userId).add(socket.id);

      socket.join(stringRoomId);

      socket.emit("room:joined", {
        success: true,
        roomId: stringRoomId,
        roomname: room.roomname,
        description: room.description,
      });

      if (isFirstSocketForUser) {
        socket.to(stringRoomId).emit("user:joined", {
          userId,
          username,
          roomId: stringRoomId,
        });
      }
    } catch (error) {
      socket.emit("room:error", { message: error.message || "Failed to join room" });
    }
  });

  socket.on("leave-room", (data = {}) => {
    try {
      const payload = normalizePayload(data);
      const roomId = payload.roomId || (typeof data === "string" ? data.trim() : null);

      if (!roomId) {
        return socket.emit("room:error", { message: "Room ID is required" });
      }

      socket.leave(roomId);

      if (roomMembers.has(roomId)) {
        const usersInRoom = roomMembers.get(roomId);
        if (usersInRoom.has(userId)) {
          const userSockets = usersInRoom.get(userId);
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            usersInRoom.delete(userId);
            socket.to(roomId).emit("user:left", {
              userId,
              username,
              roomId,
            });
          }
        }
        if (usersInRoom.size === 0) {
          roomMembers.delete(roomId);
        }
      }

      socket.emit("room:left", { success: true, roomId });
    } catch (error) {
      socket.emit("room:error", { message: error.message || "Failed to leave room" });
    }
  });

  socket.on("switch-room", async (data = {}) => {
    try {
      const payload = normalizePayload(data);
      const { oldRoomId, newRoomId } = payload;

      if (!oldRoomId || !newRoomId) {
        return socket.emit("room:error", {
          message: "Both oldRoomId and newRoomId are required",
        });
      }

      if (oldRoomId === newRoomId) {
        return socket.emit("room:error", {
          message: "Cannot switch to the same room",
        });
      }

      const targetRoom = await roomService.getRoom(newRoomId);
      const targetRoomId = targetRoom._id.toString();

      // Leave old room
      socket.leave(oldRoomId);
      if (roomMembers.has(oldRoomId)) {
        const oldUsers = roomMembers.get(oldRoomId);
        if (oldUsers.has(userId)) {
          const oldSockets = oldUsers.get(userId);
          oldSockets.delete(socket.id);
          if (oldSockets.size === 0) {
            oldUsers.delete(userId);
            socket.to(oldRoomId).emit("user:left", {
              userId,
              username,
              roomId: oldRoomId,
            });
          }
        }
        if (oldUsers.size === 0) {
          roomMembers.delete(oldRoomId);
        }
      }

      // Join new room
      if (!roomMembers.has(targetRoomId)) {
        roomMembers.set(targetRoomId, new Map());
      }
      const newUsers = roomMembers.get(targetRoomId);
      const isFirstSocket = !newUsers.has(userId) || newUsers.get(userId).size === 0;

      if (!newUsers.has(userId)) {
        newUsers.set(userId, new Set());
      }
      newUsers.get(userId).add(socket.id);

      socket.join(targetRoomId);

      if (isFirstSocket) {
        socket.to(targetRoomId).emit("user:joined", {
          userId,
          username,
          roomId: targetRoomId,
        });
      }

      socket.emit("room:switched", {
        success: true,
        oldRoomId,
        newRoomId: targetRoomId,
        roomname: targetRoom.roomname,
      });
    } catch (error) {
      socket.emit("room:error", {
        message: error.message || "Failed to switch room",
      });
    }
  });

  socket.on("disconnect", () => {
    roomMembers.forEach((usersInRoom, roomId) => {
      if (usersInRoom.has(userId)) {
        const userSockets = usersInRoom.get(userId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          usersInRoom.delete(userId);
          socket.to(roomId).emit("user:left", {
            userId,
            username,
            roomId,
          });
        }
      }
      if (usersInRoom.size === 0) {
        roomMembers.delete(roomId);
      }
    });
  });
};

export default roomHandler;
