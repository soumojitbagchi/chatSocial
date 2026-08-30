import mongoose from "mongoose";
import User from "../../model/user.model.js";
import Room from "../../model/room.model.js";
import * as presenceService from "../service/presence.service.js";
import * as callService from "../service/call.service.js";
import * as mediaService from "../service/media.service.js";
import callSessionManager, { getCallById } from "../service/callSession.manager.js";

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
 * Emit event to all active sockets of a user
 */
const emitToUser = (io, userId, eventName, payload) => {
    if (!userId) return;
    const socketIds = presenceService.getUserSocketIds(userId);
    socketIds.forEach((sid) => {
        io.to(sid).emit(eventName, payload);
    });
};

/**
 * Call Handlers for SFU Voice & Video Calling using mediasoup
 */
const callHandlers = (io, socket) => {
    const currentUserId = String(socket.user?.id || socket.user?._id || socket.id);
    const currentUsername = socket.user?.username || socket.user?.name || "User";

    // Helper to send acknowledgment or emit error
    const sendResponse = (callback, eventName, data, error = null) => {
        if (error) {
            const errPayload = {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "An error occurred",
            };
            if (typeof callback === "function") {
                callback({ error: errPayload });
            } else {
                socket.emit("call:error", errPayload);
                socket.emit("call-error", errPayload); // legacy
            }
            return;
        }

        if (typeof callback === "function") {
            callback(data);
        } else if (eventName) {
            socket.emit(eventName, data);
        }
    };

    // ==========================================
    // 1. APPLICATION CALL SIGNALING EVENTS
    // ==========================================

    /**
     * Start Call
     * Event: "call:start" (or legacy "call-user")
     * Payload: { targetUserId, type: "audio" | "video" }
     */
    const handleCallStart = async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            let targetUserId = data.targetUserId ? String(data.targetUserId) : null;
            const callType = data.type || data.callType || "audio";

            if (!targetUserId) {
                return sendResponse(callback, null, null, {
                    code: "INVALID_PARAMETERS",
                    message: "Target user ID is required to initiate a call",
                });
            }

            // Verify and resolve target user in DB
            if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(targetUserId)) {
                try {
                    const userExists = await User.exists({ _id: targetUserId });
                    if (!userExists) {
                        // If targetUserId is not a User, check if it's a direct Room ID
                        const room = await Room.findById(targetUserId).lean();
                        if (room && Array.isArray(room.members) && room.members.length > 0) {
                            const otherMember = room.members.find(
                                (m) => m && (m._id ? m._id.toString() : m.toString()) !== currentUserId
                            );
                            if (otherMember) {
                                targetUserId = otherMember._id ? otherMember._id.toString() : otherMember.toString();
                            } else {
                                return sendResponse(callback, null, null, {
                                    code: "USER_NOT_FOUND",
                                    message: "No recipient found in this chat room",
                                });
                            }
                        } else {
                            return sendResponse(callback, null, null, {
                                code: "USER_NOT_FOUND",
                                message: "Target user does not exist",
                            });
                        }
                    }
                } catch (dbErr) {
                    console.warn("[callHandlers] Target lookup warning:", dbErr);
                }
            }

            if (targetUserId === currentUserId) {
                return sendResponse(callback, null, null, {
                    code: "CANNOT_CALL_SELF",
                    message: "Cannot call yourself",
                });
            }

            // Check if target user is online
            const isOnline = presenceService.isUserOnline(targetUserId);
            if (!isOnline) {
                const rejectPayload = {
                    callerId: currentUserId,
                    targetUserId,
                    reason: "User is offline",
                    code: "USER_OFFLINE",
                };
                socket.emit("call:rejected", rejectPayload);
                socket.emit("call-rejected", rejectPayload); // legacy
                return sendResponse(callback, null, rejectPayload);
            }

            // Check if caller is already in call
            if (callService.isUserInCall(currentUserId)) {
                return sendResponse(callback, null, null, {
                    code: "USER_BUSY",
                    message: "You are already in an active call",
                });
            }

            // Check if target user is already in call
            if (callService.isUserInCall(targetUserId)) {
                const busyPayload = {
                    callerId: currentUserId,
                    targetUserId,
                    reason: "Target user is busy in another call",
                    code: "USER_BUSY",
                };
                socket.emit("call:rejected", busyPayload);
                socket.emit("call-rejected", busyPayload); // legacy
                return sendResponse(callback, null, busyPayload);
            }

            // Create call session
            const session = callService.initiateCall({
                callerId: currentUserId,
                callerSocketId: socket.id,
                targetUserId,
                callType,
            });

            // Query caller profile from MongoDB to ensure latest avatar and name
            let callerName = currentUsername;
            let callerAvatar = "";
            let callerUsername = "";
            if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(currentUserId)) {
                try {
                    const callerDoc = await User.findById(currentUserId).select("name username avatar").lean();
                    if (callerDoc) {
                        callerName = callerDoc.name || callerDoc.username || currentUsername;
                        callerAvatar = callerDoc.avatar || "";
                        callerUsername = callerDoc.username || "";
                    }
                } catch (err) {
                    console.warn("[callHandlers] Could not fetch caller details from DB:", err.message);
                }
            }
            // Notify target user of incoming call with full caller profile metadata
            const incomingPayload = {
                callId: session.callId,
                callerId: currentUserId,
                callerName,
                callerAvatar,
                callerUsername,
                avatar: callerAvatar,
                name: callerName,
                type: session.type,
                callType: session.type,
            };
            emitToUser(io, targetUserId, "call:incoming", incomingPayload);
            emitToUser(io, targetUserId, "incoming-call", incomingPayload); // legacy

            console.log(`[callHandlers] User ${currentUserId} initiated call ${session.callId} to ${targetUserId}`);

            const response = {
                callId: session.callId,
                status: "ringing",
                targetUserId,
                type: session.type,
            };

            sendResponse(callback, "call:initiated", response);
        } catch (error) {
            console.error("[callHandlers] Error in call:start:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to initiate call",
            });
        }
    };

    socket.on("call:start", handleCallStart);
    socket.on("call-user", handleCallStart); // legacy alias

    /**
     * Accept Call
     * Event: "call:accept" (or legacy "accept-call")
     * Payload: { callId, callerId? }
     */
    const handleCallAccept = async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId;
            const callerId = data.callerId ? String(data.callerId) : null;

            const session = await callService.acceptCall({
                receiverId: currentUserId,
                receiverSocketId: socket.id,
                callId,
            });
            // Query acceptor profile from MongoDB to ensure latest avatar and name
            let acceptorName = currentUsername;
            let acceptorAvatar = "";
            let acceptorUsername = "";
            if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(currentUserId)) {
                try {
                    const acceptorDoc = await User.findById(currentUserId).select("name username avatar").lean();
                    if (acceptorDoc) {
                        acceptorName = acceptorDoc.name || acceptorDoc.username || currentUsername;
                        acceptorAvatar = acceptorDoc.avatar || "";
                        acceptorUsername = acceptorDoc.username || "";
                    }
                } catch (err) {
                    console.warn("[callHandlers] Could not fetch acceptor details from DB:", err.message);
                }
            }
            const acceptedPayload = {
                callId: session.callId,
                participantId: currentUserId,
                acceptorId: currentUserId,
                acceptorName,
                acceptorAvatar,
                acceptorUsername,
                avatar: acceptorAvatar,
                name: acceptorName,
                acceptorSocketId: socket.id,
                type: session.type,
            };
            // Notify caller
            emitToUser(io, session.callerId, "call:accepted", acceptedPayload);
            emitToUser(io, session.callerId, "call-accepted", acceptedPayload); // legacy

            console.log(`[callHandlers] User ${currentUserId} accepted call ${session.callId}`);

            const response = {
                callId: session.callId,
                status: "accepted",
                type: session.type,
            };

            sendResponse(callback, "call:accepted", response);
        } catch (error) {
            console.error("[callHandlers] Error in call:accept:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to accept call",
            });
        }
    };

    socket.on("call:accept", handleCallAccept);
    socket.on("accept-call", handleCallAccept); // legacy alias

    /**
     * Reject Call
     * Event: "call:reject" (or legacy "reject-call")
     * Payload: { callId, callerId?, reason? }
     */
    const handleCallReject = async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId;
            const reason = data.reason || "Call declined";

            const result = await callService.rejectCall({
                userId: currentUserId,
                callId,
                reason,
            });

            if (result) {
                const rejectPayload = {
                    callId: result.callId,
                    targetUserId: currentUserId,
                    callerId: result.callerId,
                    reason,
                };

                emitToUser(io, result.callerId, "call:rejected", rejectPayload);
                emitToUser(io, result.callerId, "call-rejected", rejectPayload); // legacy
            }

            sendResponse(callback, null, { ok: true, reason });
        } catch (error) {
            console.error("[callHandlers] Error in call:reject:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to reject call",
            });
        }
    };

    socket.on("call:reject", handleCallReject);
    socket.on("reject-call", handleCallReject); // legacy alias

    /**
     * End Call
     * Event: "call:end" (or legacy "end-call")
     * Payload: { callId, targetUserId?, reason? }
     */
    const handleCallEnd = async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId;
            const reason = data.reason || "Call ended";

            const result = await callService.endCall({
                userId: currentUserId,
                socketId: socket.id,
                callId,
                reason,
            });

            if (result) {
                const endedPayload = {
                    callId: result.callId,
                    fromUserId: currentUserId,
                    reason,
                };

                emitToUser(io, result.callerId, "call:ended", endedPayload);
                emitToUser(io, result.callerId, "call-ended", endedPayload); // legacy
                emitToUser(io, result.receiverId, "call:ended", endedPayload);
                emitToUser(io, result.receiverId, "call-ended", endedPayload); // legacy
            }

            sendResponse(callback, null, { ok: true });
        } catch (error) {
            console.error("[callHandlers] Error in call:end:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to end call",
            });
        }
    };

    socket.on("call:end", handleCallEnd);
    socket.on("end-call", handleCallEnd); // legacy alias

    // ==========================================
    // 2. MEDIASOUP MEDIA SIGNALING EVENTS
    // ==========================================

    /**
     * Get Router RTP Capabilities
     * Event: "media:getRouterCapabilities"
     * Payload: { callId }
     */
    socket.on("media:getRouterCapabilities", async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId || callService.getUserCall(currentUserId)?.callId;

            if (!callId) {
                return sendResponse(callback, null, null, {
                    code: "CALL_NOT_FOUND",
                    message: "No active call found",
                });
            }

            const routerRtpCapabilities = await mediaService.getRouterRtpCapabilities(callId);
            sendResponse(callback, "media:routerCapabilities", { routerRtpCapabilities });
        } catch (error) {
            console.error("[callHandlers] Error in media:getRouterCapabilities:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to get router capabilities",
            });
        }
    });

    /**
     * Create WebRTC Transport
     * Event: "media:createTransport"
     * Payload: { callId, direction: "send" | "recv" }
     */
    socket.on("media:createTransport", async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId || callService.getUserCall(currentUserId)?.callId;
            const direction = data.direction; // "send" | "recv"

            if (!callId || !direction) {
                return sendResponse(callback, null, null, {
                    code: "INVALID_PARAMETERS",
                    message: "callId and direction are required",
                });
            }

            const transportParams = await mediaService.createWebRtcTransport({
                callId,
                userId: currentUserId,
                socketId: socket.id,
                direction,
            });

            sendResponse(callback, "media:transportCreated", transportParams);
        } catch (error) {
            console.error("[callHandlers] Error in media:createTransport:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to create transport",
            });
        }
    });

    /**
     * Connect WebRTC Transport
     * Event: "media:connectTransport"
     * Payload: { callId, transportId, dtlsParameters }
     */
    socket.on("media:connectTransport", async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId || callService.getUserCall(currentUserId)?.callId;
            const { transportId, dtlsParameters } = data;

            if (!callId || !transportId || !dtlsParameters) {
                return sendResponse(callback, null, null, {
                    code: "INVALID_PARAMETERS",
                    message: "callId, transportId, and dtlsParameters are required",
                });
            }

            const result = await mediaService.connectWebRtcTransport({
                callId,
                userId: currentUserId,
                transportId,
                dtlsParameters,
            });

            sendResponse(callback, "media:transportConnected", result);
        } catch (error) {
            console.error("[callHandlers] Error in media:connectTransport:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to connect transport",
            });
        }
    });

    /**
     * Produce Media (Audio/Video)
     * Event: "media:produce"
     * Payload: { callId, transportId, kind: "audio" | "video", rtpParameters, appData? }
     */
    socket.on("media:produce", async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId || callService.getUserCall(currentUserId)?.callId;
            const { transportId, kind, rtpParameters, appData } = data;

            if (!callId || !transportId || !kind || !rtpParameters) {
                return sendResponse(callback, null, null, {
                    code: "INVALID_PARAMETERS",
                    message: "callId, transportId, kind, and rtpParameters are required",
                });
            }

            const producerResult = await mediaService.createProducer({
                callId,
                userId: currentUserId,
                transportId,
                kind,
                rtpParameters,
                appData,
            });

            // Notify other participants in the call of new producer
            const session = getCallById(callId);
            if (session) {
                for (const [peerUserId] of session.participants) {
                    if (peerUserId !== currentUserId) {
                        const newProducerPayload = {
                            callId,
                            producerId: producerResult.id,
                            participantId: currentUserId,
                            kind: producerResult.kind,
                            appData,
                        };
                        emitToUser(io, peerUserId, "media:newProducer", newProducerPayload);
                    }
                }
            }

            sendResponse(callback, "media:produced", { id: producerResult.id });
        } catch (error) {
            console.error("[callHandlers] Error in media:produce:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to produce media",
            });
        }
    });

    /**
     * Get All Producers for Call
     * Event: "media:getProducers"
     * Payload: { callId }
     */
    socket.on("media:getProducers", async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId || callService.getUserCall(currentUserId)?.callId;

            if (!callId) {
                return sendResponse(callback, null, null, {
                    code: "CALL_NOT_FOUND",
                    message: "No active call found",
                });
            }

            const producers = mediaService.getProducersForCall(callId, currentUserId);
            sendResponse(callback, "media:producersList", { producers });
        } catch (error) {
            console.error("[callHandlers] Error in media:getProducers:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to get producers",
            });
        }
    });

    /**
     * Consume Media
     * Event: "media:consume"
     * Payload: { callId, producerId, rtpCapabilities }
     */
    socket.on("media:consume", async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId || callService.getUserCall(currentUserId)?.callId;
            const { producerId, rtpCapabilities } = data;

            if (!callId || !producerId || !rtpCapabilities) {
                return sendResponse(callback, null, null, {
                    code: "INVALID_PARAMETERS",
                    message: "callId, producerId, and rtpCapabilities are required",
                });
            }

            const consumerParams = await mediaService.createConsumer({
                callId,
                userId: currentUserId,
                producerId,
                rtpCapabilities,
            });

            sendResponse(callback, "media:consumed", consumerParams);
        } catch (error) {
            console.error("[callHandlers] Error in media:consume:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to consume media",
            });
        }
    });

    /**
     * Resume Consumer
     * Event: "media:resumeConsumer"
     * Payload: { callId, consumerId }
     */
    socket.on("media:resumeConsumer", async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId || callService.getUserCall(currentUserId)?.callId;
            const { consumerId } = data;

            if (!callId || !consumerId) {
                return sendResponse(callback, null, null, {
                    code: "INVALID_PARAMETERS",
                    message: "callId and consumerId are required",
                });
            }

            const result = await mediaService.resumeConsumer({
                callId,
                userId: currentUserId,
                consumerId,
            });

            sendResponse(callback, "media:consumerResumed", result);
        } catch (error) {
            console.error("[callHandlers] Error in media:resumeConsumer:", error);
            sendResponse(callback, null, null, {
                code: error.code || "MEDIA_ERROR",
                message: error.message || "Failed to resume consumer",
            });
        }
    });

    /**
     * Close Producer
     * Event: "media:closeProducer"
     * Payload: { callId, producerId }
     */
    socket.on("media:closeProducer", async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId || callService.getUserCall(currentUserId)?.callId;
            const { producerId } = data;

            if (!callId || !producerId) return;

            await mediaService.closeProducer({
                callId,
                userId: currentUserId,
                producerId,
            });

            // Notify other participants
            const session = getCallById(callId);
            if (session) {
                for (const [peerUserId] of session.participants) {
                    if (peerUserId !== currentUserId) {
                        emitToUser(io, peerUserId, "media:producerClosed", { callId, producerId });
                    }
                }
            }

            sendResponse(callback, null, { closed: true });
        } catch (error) {
            console.error("[callHandlers] Error in media:closeProducer:", error);
        }
    });

    /**
     * Close Consumer
     * Event: "media:closeConsumer"
     * Payload: { callId, consumerId }
     */
    socket.on("media:closeConsumer", async (rawPayload = {}, callback) => {
        try {
            const data = parsePayload(rawPayload);
            const callId = data.callId || callService.getUserCall(currentUserId)?.callId;
            const { consumerId } = data;

            if (!callId || !consumerId) return;

            await mediaService.closeConsumer({
                callId,
                userId: currentUserId,
                consumerId,
            });

            sendResponse(callback, null, { closed: true });
        } catch (error) {
            console.error("[callHandlers] Error in media:closeConsumer:", error);
        }
    });

    // ==========================================
    // 3. DISCONNECT CLEANUP
    // ==========================================

    socket.on("disconnect", async () => {
        try {
            const result = await callService.handleDisconnect(socket.id, currentUserId);
            if (result && result.peerId) {
                const endedPayload = {
                    callId: result.callId,
                    fromUserId: currentUserId,
                    reason: "Peer disconnected",
                };
                emitToUser(io, result.peerId, "call:ended", endedPayload);
                emitToUser(io, result.peerId, "call-ended", endedPayload); // legacy
            }
        } catch (err) {
            console.error(`[callHandlers] Error in socket disconnect cleanup:`, err);
        }
    });
};

export default callHandlers;
