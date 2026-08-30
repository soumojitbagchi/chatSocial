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

      const roomCreatedPayload = {
        success: true,
        roomId,
        roomname: room.roomname,
        description: room.description,
        createdBy: room.createdBy,
      };

      socket.emit("room:created", roomCreatedPayload);
      socket.broadcast.emit("room:created", roomCreatedPayload);

      const count = io.engine.clientsCount;
      console.log(`Number of connected clients: ${count}`);
    } catch (error) {
      socket.emit("room:error", { message: error.message || "Failed to create room" });
    }
  });

  const handleJoinRoom = async (data = {}) => {
    try {
      const payload = normalizePayload(data);
      const roomId = payload.roomId || (typeof data === "string" ? data.trim() : null);

      if (!roomId) {
        return socket.emit("room:error", { message: "Room ID is required" });
      }

      const stringRoomId = String(roomId);
      socket.join(stringRoomId);

      let roomname = stringRoomId;
      let description = "";
      try {
        const room = await roomService.getRoom(stringRoomId);
        if (room) {
          roomname = room.roomname || stringRoomId;
          description = room.description || "";
        }
      } catch {
        // Fallback to room ID if room service query fails or in mock mode
      }

      if (!roomMembers.has(stringRoomId)) {
        roomMembers.set(stringRoomId, new Map());
      }
      const usersInRoom = roomMembers.get(stringRoomId);
      const isFirstSocketForUser = !usersInRoom.has(userId) || usersInRoom.get(userId).size === 0;

      if (!usersInRoom.has(userId)) {
        usersInRoom.set(userId, new Set());
      }
      usersInRoom.get(userId).add(socket.id);

      socket.emit("room:joined", {
        success: true,
        roomId: stringRoomId,
        roomname,
        description,
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
  };

  socket.on("join-room", handleJoinRoom);
  socket.on("joinRoom", handleJoinRoom);

  const handleLeaveRoom = (data = {}) => {
    try {
      const payload = normalizePayload(data);
      const roomId = payload.roomId || (typeof data === "string" ? data.trim() : null);

      if (!roomId) {
        return socket.emit("room:error", { message: "Room ID is required" });
      }

      const stringRoomId = String(roomId);
      socket.leave(stringRoomId);

      if (roomMembers.has(stringRoomId)) {
        const usersInRoom = roomMembers.get(stringRoomId);
        if (usersInRoom.has(userId)) {
          const userSockets = usersInRoom.get(userId);
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            usersInRoom.delete(userId);
            socket.to(stringRoomId).emit("user:left", {
              userId,
              username,
              roomId: stringRoomId,
            });
          }
        }
        if (usersInRoom.size === 0) {
          roomMembers.delete(stringRoomId);
        }
      }

      socket.emit("room:left", { success: true, roomId: stringRoomId });
    } catch (error) {
      socket.emit("room:error", { message: error.message || "Failed to leave room" });
    }
  };

  socket.on("leave-room", handleLeaveRoom);
  socket.on("leaveRoom", handleLeaveRoom);
  const handleSwitchRoom = async (data = {}) => {
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

      const stringOldId = String(oldRoomId);
      const stringNewId = String(newRoomId);

      // Leave old room
      socket.leave(stringOldId);
      if (roomMembers.has(stringOldId)) {
        const oldUsers = roomMembers.get(stringOldId);
        if (oldUsers.has(userId)) {
          const oldSockets = oldUsers.get(userId);
          oldSockets.delete(socket.id);
          if (oldSockets.size === 0) {
            oldUsers.delete(userId);
            socket.to(stringOldId).emit("user:left", {
              userId,
              username,
              roomId: stringOldId,
            });
          }
        }
        if (oldUsers.size === 0) {
          roomMembers.delete(stringOldId);
        }
      }

      // Join new room
      socket.join(stringNewId);
      let roomname = stringNewId;
      try {
        const targetRoom = await roomService.getRoom(stringNewId);
        if (targetRoom) {
          roomname = targetRoom.roomname || stringNewId;
        }
      } catch {
        // Fallback
      }

      if (!roomMembers.has(stringNewId)) {
        roomMembers.set(stringNewId, new Map());
      }
      const newUsers = roomMembers.get(stringNewId);
      const isFirstSocket = !newUsers.has(userId) || newUsers.get(userId).size === 0;

      if (!newUsers.has(userId)) {
        newUsers.set(userId, new Set());
      }
      newUsers.get(userId).add(socket.id);

      if (isFirstSocket) {
        socket.to(stringNewId).emit("user:joined", {
          userId,
          username,
          roomId: stringNewId,
        });
      }

      socket.emit("room:switched", {
        success: true,
        oldRoomId: stringOldId,
        newRoomId: stringNewId,
        roomname,
      });
    } catch (error) {
      socket.emit("room:error", {
        message: error.message || "Failed to switch room",
      });
    }
  };

  socket.on("switch-room", handleSwitchRoom);
  socket.on("switchRoom", handleSwitchRoom);

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
