import { roomData as Room } from "../../model/room.model.js";

const activeMembers = new Map();

const roomHandler = (io, socket) => {
  const userId = socket.user?.id || socket.user?._id?.toString() || socket.id;
  const username = socket.user?.username || socket.user?.name || "Anonymous";

  socket.on("create-room", async ({ roomName, description }) => {
    try {
      if (!roomName || !roomName.trim()) {
        return socket.emit("room:error", {
          message: "Room name is required",
        });
      }
      const isAlreadyExists = await Room.findOne({ roomname: roomName.trim() });
      if (isAlreadyExists) {
        return socket.emit("room:error", {
          message: "Room already exists",
        });
      }

      const room = await Room.create({
        roomname: roomName.trim(),
        description: description || "",
        createdBy: userId,
      });
      const roomId = room._id.toString();
      if (!activeMembers.has(roomId)) {
        activeMembers.set(roomId, new Set());
      }
      activeMembers.get(roomId).add(userId);

      socket.join(roomId);

      socket.emit("room:created", {
        roomId,
        roomName: room.roomname,
        description: room.description,
        createdBy: userId,
      });

      console.log(`Room ${roomId} created by ${userId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      socket.emit("room:error", { message: "Failed to create room" });
    }
  });

  socket.on("join-room", async ({ roomId }) => {
    try {
      if (!roomId) {
        return socket.emit("room:error", { message: "Room ID is required" });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return socket.emit("room:error", {
          message: "Room not found",
        });
      }

      if (!activeMembers.has(roomId)) {
        activeMembers.set(roomId, new Set());
      }
      const member = activeMembers.get(roomId);
      if (member.has(userId)) {
        return socket.emit("room:error", {
          message: "Already in room",
        });
      }
      member.add(userId);
      socket.join(roomId);

      socket.emit("room:joined", {
        roomId,
        roomName: room.roomname,
      });

      socket.to(roomId).emit("user:joined", {
        userId,
        username,
        roomId,
      });
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("room:error", { message: "Failed to join room" });
    }
  });

  socket.on("leave-room", ({ roomId }) => {
    try {
      if (!roomId || !activeMembers.has(roomId)) {
        return socket.emit("room:error", {
          message: "Room not active",
        });
      }

      const members = activeMembers.get(roomId);
      if (!members.has(userId)) {
        return socket.emit("room:error", {
          message: "You are not in this room",
        });
      }

      members.delete(userId);
      if (members.size === 0) {
        activeMembers.delete(roomId);
      }

      socket.leave(roomId);

      socket.emit("room:left", { roomId });
      socket.to(roomId).emit("user:left", {
        userId,
        username,
        roomId,
      });
    } catch (error) {
      console.error("Error leaving room:", error);
      socket.emit("room:error", { message: "Failed to leave room" });
    }
  });

  socket.on("switch-room", async ({ oldRoomId, newRoomId }) => {
    try {
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

      const newRoom = await Room.findById(newRoomId);
      if (!newRoom) {
        return socket.emit("room:error", {
          message: "Target room does not exist",
        });
      }

      if (activeMembers.has(newRoomId) && activeMembers.get(newRoomId).has(userId)) {
        return socket.emit("room:error", {
          message: "Already in new room",
        });
      }

      if (activeMembers.has(oldRoomId)) {
        const oldMembers = activeMembers.get(oldRoomId);
        oldMembers.delete(userId);
        if (oldMembers.size === 0) {
          activeMembers.delete(oldRoomId);
        }
      }
      socket.leave(oldRoomId);
      socket.to(oldRoomId).emit("user:left", {
        userId,
        username,
        roomId: oldRoomId,
      });

      if (!activeMembers.has(newRoomId)) {
        activeMembers.set(newRoomId, new Set());
      }
      activeMembers.get(newRoomId).add(userId);
      socket.join(newRoomId);

      socket.to(newRoomId).emit("user:joined", {
        userId,
        username,
        roomId: newRoomId,
      });

      socket.emit("room:switched", {
        oldRoomId,
        newRoomId,
        roomName: newRoom.roomname,
      });
    } catch (error) {
      console.error("Error switching room:", error);
      socket.emit("room:error", {
        message: "Failed to switch room",
      });
    }
  });

  socket.on("disconnect", () => {
    activeMembers.forEach((members, roomId) => {
      if (members.has(userId)) {
        members.delete(userId);
        socket.to(roomId).emit("user:left", {
          userId,
          username,
          roomId,
        });
        if (members.size === 0) {
          activeMembers.delete(roomId);
        }
      }
    });
  });
};

export default roomHandler;
