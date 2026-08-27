import mongoose from "mongoose";
import User from "../../model/user.model.js";
import * as presenceService from "../service/presence.service.js";
import * as callService from "../service/call.service.js";

/**
 * Safely parse incoming socket payload (handles object or JSON string)
 */
const parsePayload = (data) => {
    if (typeof data === "string") {
        try {
            return JSON.parse(data);
        } catch {
            return { targetUserId: data, callerId: data };
        }
    }
    return data || {};
};

/**
 * Call Handlers for 1-to-1 WebRTC Voice Calling
 */
const callHandlers = (io, socket) => {
    const currentUserId = String(socket.user?.id || socket.user?._id || socket.id);
    const currentUsername = socket.user?.username || socket.user?.name || "User";

    /**
     * 1. call-user
     * Payload: { targetUserId, callType: "audio" }
     */
    socket.on("call-user", async (rawPayload = {}) => {
        try {
            const data = parsePayload(rawPayload);
            const targetUserId = data.targetUserId ? String(data.targetUserId) : null;
            const callType = data.callType || "audio";

            if (!targetUserId) {
                return socket.emit("call-error", {
                    message: "Target user ID is required to initiate a call",
                });
            }

            // Prevent calling oneself
            if (targetUserId === currentUserId) {
                return socket.emit("call-error", {
                    message: "Cannot call yourself",
                });
            }

            // Validate target user exists in database if database connected
            if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(targetUserId)) {
                try {
                    const userExists = await User.findById(targetUserId).lean();
                    if (!userExists) {
                        return socket.emit("call-error", {
                            message: "Target user does not exist",
                        });
                    }
                } catch (dbErr) {
                    console.warn("DB user check failed, proceeding with presence verification:", dbErr.message);
                }
            }

            // Validate target user is currently online
            const isOnline = presenceService.isUserOnline(targetUserId);
            if (!isOnline) {
                return socket.emit("call-rejected", {
                    callerId: currentUserId,
                    targetUserId,
                    reason: "User is offline",
                });
            }

            // Check if caller is already in an active/ringing call
            if (callService.isUserInCall(currentUserId)) {
                return socket.emit("call-error", {
                    message: "You are already in an active call",
                });
            }

            // Check if target user is already busy in another call
            if (callService.isUserInCall(targetUserId)) {
                return socket.emit("call-rejected", {
                    callerId: currentUserId,
                    targetUserId,
                    reason: "User is busy in another call",
                });
            }

            // Initiate call session
            const session = callService.initiateCall({
                callerId: currentUserId,
                callerSocketId: socket.id,
                targetUserId,
                callType,
            });

            // Notify target user via incoming-call event
            const targetSocketIds = presenceService.getUserSocketIds(targetUserId);
            const incomingPayload = {
                callerId: currentUserId,
                callerSocketId: socket.id,
                callerName: currentUsername,
                callType,
                callId: session.callId,
            };

            targetSocketIds.forEach((targetSocketId) => {
                io.to(targetSocketId).emit("incoming-call", incomingPayload);
            });
        } catch (error) {
            console.error("Error in call-user:", error);
            socket.emit("call-error", {
                message: error.message || "Failed to initiate call",
            });
        }
    });

    /**
     * 3. accept-call
     * Payload: { callerId }
     */
    socket.on("accept-call", async (rawPayload = {}) => {
        try {
            const data = parsePayload(rawPayload);
            const callerId = data.callerId ? String(data.callerId) : null;

            const session = callService.acceptCall({
                callerId,
                receiverId: currentUserId,
                receiverSocketId: socket.id,
            });

            const resolvedCallerId = session.callerId;
            const callerSocketIds = presenceService.getUserSocketIds(resolvedCallerId);

            const acceptPayload = {
                acceptorId: currentUserId,
                acceptorSocketId: socket.id,
                callerId: resolvedCallerId,
                callId: session.callId,
            };

            // 4. call-accepted: notify caller
            if (session.callerSocketId) {
                io.to(session.callerSocketId).emit("call-accepted", acceptPayload);
            } else {
                callerSocketIds.forEach((targetSocketId) => {
                    io.to(targetSocketId).emit("call-accepted", acceptPayload);
                });
            }

            // Acknowledge acceptance to the accepting client
            socket.emit("call-accepted", acceptPayload);
        } catch (error) {
            console.error("Error in accept-call:", error);
            socket.emit("call-error", {
                message: error.message || "Failed to accept call",
            });
        }
    });

    /**
     * 5. reject-call
     * Payload: { callerId, reason }
     */
    socket.on("reject-call", async (rawPayload = {}) => {
        try {
            const data = parsePayload(rawPayload);
            const callerId = data.callerId ? String(data.callerId) : null;
            const reason = data.reason || "Call declined by user";

            const endedCall = callService.rejectCall({
                callerId,
                receiverId: currentUserId,
            });

            const resolvedCallerId = endedCall?.callerId || callerId;
            if (resolvedCallerId) {
                const callerSockets = presenceService.getUserSocketIds(resolvedCallerId);
                const rejectPayload = {
                    callerId: resolvedCallerId,
                    targetUserId: currentUserId,
                    reason,
                };

                // 6. call-rejected: notify caller
                if (endedCall?.callerSocketId) {
                    io.to(endedCall.callerSocketId).emit("call-rejected", rejectPayload);
                } else {
                    callerSockets.forEach((targetSocketId) => {
                        io.to(targetSocketId).emit("call-rejected", rejectPayload);
                    });
                }
            }

            socket.emit("call-ended", {
                reason: "Call rejected",
                fromUserId: currentUserId,
            });
        } catch (error) {
            console.error("Error in reject-call:", error);
            socket.emit("call-error", {
                message: error.message || "Failed to reject call",
            });
        }
    });

    /**
     * 7. offer
     * Forward WebRTC SDP offer to target user
     * Payload: { targetUserId, targetSocketId, offer }
     */
    socket.on("offer", async (rawPayload = {}) => {
        try {
            const data = parsePayload(rawPayload);
            const targetUserId = data.targetUserId || data.to;
            const offer = data.offer || data.sdp;

            if (!offer) {
                return socket.emit("call-error", { message: "Offer SDP is required" });
            }

            let targetSockets = [];
            if (data.targetSocketId) {
                targetSockets = [String(data.targetSocketId)];
            } else if (targetUserId) {
                targetSockets = presenceService.getUserSocketIds(String(targetUserId));
            } else {
                const call = callService.getUserCall(currentUserId);
                if (call) {
                    const peerId = call.callerId === currentUserId ? call.receiverId : call.callerId;
                    targetSockets = presenceService.getUserSocketIds(peerId);
                }
            }

            const offerForwardPayload = {
                offer,
                fromUserId: currentUserId,
                fromSocketId: socket.id,
                callerId: currentUserId,
            };

            targetSockets.forEach((targetSocketId) => {
                io.to(targetSocketId).emit("offer", offerForwardPayload);
            });
        } catch (error) {
            console.error("Error forwarding offer:", error);
            socket.emit("call-error", { message: "Failed to forward offer" });
        }
    });

    /**
     * 8. answer
     * Forward WebRTC SDP answer to target user
     * Payload: { targetUserId, callerId, targetSocketId, answer }
     */
    socket.on("answer", async (rawPayload = {}) => {
        try {
            const data = parsePayload(rawPayload);
            const targetUserId = data.targetUserId || data.callerId || data.to;
            const answer = data.answer || data.sdp;

            if (!answer) {
                return socket.emit("call-error", { message: "Answer SDP is required" });
            }

            let targetSockets = [];
            if (data.targetSocketId) {
                targetSockets = [String(data.targetSocketId)];
            } else if (targetUserId) {
                targetSockets = presenceService.getUserSocketIds(String(targetUserId));
            } else {
                const call = callService.getUserCall(currentUserId);
                if (call) {
                    const peerId = call.callerId === currentUserId ? call.receiverId : call.callerId;
                    targetSockets = presenceService.getUserSocketIds(peerId);
                }
            }

            const answerForwardPayload = {
                answer,
                fromUserId: currentUserId,
                fromSocketId: socket.id,
            };

            targetSockets.forEach((targetSocketId) => {
                io.to(targetSocketId).emit("answer", answerForwardPayload);
            });
        } catch (error) {
            console.error("Error forwarding answer:", error);
            socket.emit("call-error", { message: "Failed to forward answer" });
        }
    });

    /**
     * 9. ice-candidate
     * Forward WebRTC ICE candidate between peers
     * Payload: { targetUserId, targetSocketId, candidate }
     */
    socket.on("ice-candidate", async (rawPayload = {}) => {
        try {
            const data = parsePayload(rawPayload);
            const targetUserId = data.targetUserId || data.to;
            const candidate = data.candidate;

            if (!candidate) {
                return;
            }

            let targetSockets = [];
            if (data.targetSocketId) {
                targetSockets = [String(data.targetSocketId)];
            } else if (targetUserId) {
                targetSockets = presenceService.getUserSocketIds(String(targetUserId));
            } else {
                const call = callService.getUserCall(currentUserId);
                if (call) {
                    const peerId = call.callerId === currentUserId ? call.receiverId : call.callerId;
                    targetSockets = presenceService.getUserSocketIds(peerId);
                }
            }

            const candidatePayload = {
                candidate,
                fromUserId: currentUserId,
                fromSocketId: socket.id,
            };

            targetSockets.forEach((targetSocketId) => {
                io.to(targetSocketId).emit("ice-candidate", candidatePayload);
            });
        } catch (error) {
            console.error("Error forwarding ICE candidate:", error);
        }
    });

    /**
     * 10. end-call
     * Notify other peer and clean up call
     * Payload: { targetUserId, callId, reason }
     */
    socket.on("end-call", async (rawPayload = {}) => {
        try {
            const data = parsePayload(rawPayload);
            const targetUserId = data.targetUserId || data.to;
            const reason = data.reason || "Call ended by user";

            const endedCall = callService.endCall({
                userId: currentUserId,
                socketId: socket.id,
                callId: data.callId,
            });

            const peerId = endedCall
                ? (endedCall.callerId === currentUserId ? endedCall.receiverId : endedCall.callerId)
                : (targetUserId ? String(targetUserId) : null);

            if (peerId) {
                const peerSockets = presenceService.getUserSocketIds(peerId);
                const endedPayload = {
                    reason,
                    fromUserId: currentUserId,
                    callId: endedCall?.callId || data.callId || null,
                };

                peerSockets.forEach((targetSocketId) => {
                    io.to(targetSocketId).emit("call-ended", endedPayload);
                });
            }

            // 11. call-ended: notify the requester as well
            socket.emit("call-ended", {
                reason,
                fromUserId: currentUserId,
                callId: endedCall?.callId || data.callId || null,
            });
        } catch (error) {
            console.error("Error in end-call:", error);
            socket.emit("call-ended", {
                reason: "Call ended",
                fromUserId: currentUserId,
            });
        }
    });

    /**
     * Disconnect cleanup for call sessions
     */
    socket.on("disconnect", () => {
        try {
            const discResult = callService.handleDisconnect(socket.id, currentUserId);
            if (discResult && discResult.peerId) {
                const peerSockets = presenceService.getUserSocketIds(discResult.peerId);
                const disconnectEndedPayload = {
                    reason: "User disconnected",
                    fromUserId: currentUserId,
                    callId: discResult.call?.callId || null,
                };

                peerSockets.forEach((targetSocketId) => {
                    io.to(targetSocketId).emit("call-ended", disconnectEndedPayload);
                });
            }
        } catch (error) {
            console.error("Error during disconnect call cleanup:", error);
        }
    });
};

export default callHandlers;
