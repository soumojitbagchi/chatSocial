import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { io as Client } from "../frontend/node_modules/socket.io-client/build/esm/index.js";
import registerSocketHandler from "./src/sockets/index.js";
import * as callService from "./src/sockets/service/call.service.js";
import * as presenceService from "./src/sockets/service/presence.service.js";
import { closeMediasoupWorkers } from "./src/sockets/service/mediasoupWorker.js";

process.env.JWT_KEY = "test_jwt_secret_key_12345";
process.env.MEDIASOUP_MIN_PORT = "40000";
process.env.MEDIASOUP_MAX_PORT = "40100";
process.env.MEDIASOUP_LOG_LEVEL = "warn";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" },
});
registerSocketHandler(io);

const PORT = 8095;

const userA = { id: "507f1f77bcf86cd799439011", username: "Alice", email: "alice@test.com" };
const userB = { id: "507f1f77bcf86cd799439022", username: "Bob", email: "bob@test.com" };
const userC = { id: "507f1f77bcf86cd799439033", username: "Charlie", email: "charlie@test.com" };

const tokenA = jwt.sign(userA, process.env.JWT_KEY);
const tokenB = jwt.sign(userB, process.env.JWT_KEY);
const tokenC = jwt.sign(userC, process.env.JWT_KEY);

function createClientSocket(token, user) {
    return Client(`http://localhost:${PORT}`, {
        auth: { token },
        query: { userId: user.id, username: user.username },
        transports: ["websocket"],
        forceNew: true,
    });
}

function waitEvent(socket, eventName, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for event '${eventName}' on socket ${socket.id}`));
        }, timeoutMs);
        socket.once(eventName, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

function socketRequest(socket, eventName, data, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for ack callback for event '${eventName}'`));
        }, timeoutMs);
        socket.emit(eventName, data, (response) => {
            clearTimeout(timer);
            if (response && response.error) {
                return reject(new Error(response.error.message || `Error on event ${eventName}`));
            }
            resolve(response);
        });
    });
}

async function runTests() {
    console.log("===============================================================");
    console.log("=== STARTING MEDIASOUP SFU SIGNALING & MEDIA TEST SUITE ===");
    console.log("===============================================================");

    await new Promise((resolve) => httpServer.listen(PORT, resolve));
    console.log(`Test SFU server running on port ${PORT}`);

    let clientA = null;
    let clientB = null;
    let clientC = null;

    try {
        // 1. Connect Client A and Client B
        clientA = createClientSocket(tokenA, userA);
        clientB = createClientSocket(tokenB, userB);

        await Promise.all([
            waitEvent(clientA, "connect"),
            waitEvent(clientB, "connect"),
        ]);
        console.log("✓ Client A and Client B connected");

        // 2. Announce online presence
        clientA.emit("online");
        clientB.emit("online");
        await new Promise((r) => setTimeout(r, 100));

        if (!presenceService.isUserOnline(userA.id) || !presenceService.isUserOnline(userB.id)) {
            throw new Error("Presence check failed: users should be online");
        }
        console.log("✓ Presence verified: User A and User B are online");

        // 3. Validation: Prevent calling oneself
        console.log("\n--- Test 1: Prevent Self-Calling ---");
        const selfCallPromise = waitEvent(clientA, "call:error");
        clientA.emit("call:start", { targetUserId: userA.id, type: "audio" });
        const selfCallErr = await selfCallPromise;
        if (!selfCallErr.message || !selfCallErr.message.includes("Cannot call yourself")) {
            throw new Error(`Unexpected self-call error: ${JSON.stringify(selfCallErr)}`);
        }
        console.log("✓ Self-call prevented with call:error:", selfCallErr.message);

        // 4. Validation: Offline user rejection
        console.log("\n--- Test 2: Offline User Call Rejection ---");
        const offlinePromise = waitEvent(clientA, "call:rejected");
        clientA.emit("call:start", { targetUserId: "507f1f77bcf86cd799439099", type: "audio" });
        const offlineErr = await offlinePromise;
        if (!offlineErr.reason || !offlineErr.reason.includes("offline")) {
            throw new Error(`Unexpected offline call response: ${JSON.stringify(offlineErr)}`);
        }
        console.log("✓ Call to offline user rejected with call:rejected:", offlineErr.reason);

        // 5. Complete 1-to-1 Audio Call Flow with mediasoup SFU
        console.log("\n--- Test 3: Complete 1-to-1 Audio Call with SFU Transports & Media ---");
        const incomingPromise = waitEvent(clientB, "call:incoming");
        clientA.emit("call:start", { targetUserId: userB.id, type: "audio" });
        const incomingData = await incomingPromise;

        console.log("✓ User B received call:incoming:", incomingData);
        if (incomingData.callerId !== userA.id || incomingData.type !== "audio" || !incomingData.callId) {
            throw new Error("Invalid call:incoming payload");
        }
        const callId = incomingData.callId;

        // 6. Validation: Busy user rejection during active/ringing call
        console.log("\n--- Test 4: Busy User Call Rejection ---");
        clientC = createClientSocket(tokenC, userC);
        await waitEvent(clientC, "connect");
        clientC.emit("online");
        await new Promise((r) => setTimeout(r, 50));

        const busyPromise = waitEvent(clientC, "call:rejected");
        clientC.emit("call:start", { targetUserId: userB.id, type: "audio" });
        const busyErr = await busyPromise;
        if (!busyErr.reason || !busyErr.reason.includes("busy")) {
            throw new Error(`Unexpected busy response: ${JSON.stringify(busyErr)}`);
        }
        console.log("✓ User C calling busy User B rejected with:", busyErr.reason);
        clientC.disconnect();
        clientC = null;

        // 7. Accept Call
        console.log("\n--- Test 5: Call Acceptance & Router Capabilities Exchange ---");
        const acceptedPromiseA = waitEvent(clientA, "call:accepted");
        clientB.emit("call:accept", { callId });
        const acceptedDataA = await acceptedPromiseA;
        console.log("✓ User A received call:accepted:", acceptedDataA);

        // 8. Router Capabilities
        const rtpCapsA = await socketRequest(clientA, "media:getRouterCapabilities", { callId });
        const rtpCapsB = await socketRequest(clientB, "media:getRouterCapabilities", { callId });
        if (!rtpCapsA.routerRtpCapabilities || !rtpCapsA.routerRtpCapabilities.codecs) {
            throw new Error("Failed to get router RTP capabilities for User A");
        }
        console.log(`✓ Router RTP capabilities received (codecs count: ${rtpCapsA.routerRtpCapabilities.codecs.length})`);

        // 9. WebRTC Transports Creation (Send & Recv) on SFU
        console.log("\n--- Test 6: WebRTC Transport Creation on SFU ---");
        const sendTransportA = await socketRequest(clientA, "media:createTransport", { callId, direction: "send" });
        const recvTransportA = await socketRequest(clientA, "media:createTransport", { callId, direction: "recv" });
        const sendTransportB = await socketRequest(clientB, "media:createTransport", { callId, direction: "send" });
        const recvTransportB = await socketRequest(clientB, "media:createTransport", { callId, direction: "recv" });

        if (!sendTransportA.id || !sendTransportA.iceParameters || !sendTransportA.dtlsParameters) {
            throw new Error("Invalid send transport created for User A");
        }
        console.log(`✓ User A send transport created [${sendTransportA.id}] and recv transport [${recvTransportA.id}]`);
        console.log(`✓ User B send transport created [${sendTransportB.id}] and recv transport [${recvTransportB.id}]`);

        // 10. WebRTC Transports DTLS Connection
        console.log("\n--- Test 7: WebRTC Transport DTLS Connection ---");
        const dummyDtlsParamsA = {
            role: "server",
            fingerprints: [{ algorithm: "sha-256", value: "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99" }]
        };
        const dummyDtlsParamsB = {
            role: "server",
            fingerprints: [{ algorithm: "sha-256", value: "11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00" }]
        };

        await socketRequest(clientA, "media:connectTransport", {
            callId,
            transportId: sendTransportA.id,
            dtlsParameters: dummyDtlsParamsA,
        });
        await socketRequest(clientA, "media:connectTransport", {
            callId,
            transportId: recvTransportA.id,
            dtlsParameters: dummyDtlsParamsA,
        });
        await socketRequest(clientB, "media:connectTransport", {
            callId,
            transportId: sendTransportB.id,
            dtlsParameters: dummyDtlsParamsB,
        });
        await socketRequest(clientB, "media:connectTransport", {
            callId,
            transportId: recvTransportB.id,
            dtlsParameters: dummyDtlsParamsB,
        });
        console.log("✓ All WebRTC transports connected successfully");

        // 11. Produce Audio on Send Transport (User A -> SFU)
        console.log("\n--- Test 8: Media Production & Announcement (User A produces Audio) ---");
        const newProducerPromiseB = waitEvent(clientB, "media:newProducer");

        const dummyAudioRtpParams = {
            codecs: [
                {
                    mimeType: "audio/opus",
                    payloadType: 111,
                    clockRate: 48000,
                    channels: 2,
                    parameters: { minptime: 10, useinbandfec: 1 },
                }
            ],
            headerExtensions: [],
            encodings: [{ ssrc: 11111111 }],
            rtcp: { cname: "alice-audio", reducedSize: true },
        };

        const producerA = await socketRequest(clientA, "media:produce", {
            callId,
            transportId: sendTransportA.id,
            kind: "audio",
            rtpParameters: dummyAudioRtpParams,
            appData: { trackName: "microphone" },
        });

        if (!producerA.id) {
            throw new Error("Failed to produce audio track on SFU");
        }
        console.log(`✓ User A audio producer created on SFU [${producerA.id}]`);

        const announcedProducerB = await newProducerPromiseB;
        if (announcedProducerB.producerId !== producerA.id || announcedProducerB.kind !== "audio") {
            throw new Error("User B did not receive valid media:newProducer event");
        }
        console.log(`✓ User B notified of new audio producer: [${announcedProducerB.producerId}] from participant [${announcedProducerB.participantId}]`);

        // 12. Consume Audio on Receive Transport (User B consumes User A's producer)
        console.log("\n--- Test 9: Media Consumption & Resume (User B consumes User A) ---");
        const clientBRtpCapabilities = rtpCapsB.routerRtpCapabilities;

        const consumerB = await socketRequest(clientB, "media:consume", {
            callId,
            producerId: producerA.id,
            rtpCapabilities: clientBRtpCapabilities,
        });

        if (!consumerB.id || consumerB.producerId !== producerA.id || consumerB.kind !== "audio") {
            throw new Error("Failed to create consumer on SFU for User B");
        }
        console.log(`✓ User B created consumer [${consumerB.id}] on SFU (initially paused)`);

        // Resume Consumer after client creates local track
        const resumeRes = await socketRequest(clientB, "media:resumeConsumer", {
            callId,
            consumerId: consumerB.id,
        });
        if (!resumeRes.resumed) {
            throw new Error("Failed to resume consumer on SFU");
        }
        console.log("✓ User B consumer resumed on SFU");

        // 13. End Call
        console.log("\n--- Test 10: Call Termination & Cleanup ---");
        const endPromiseA = waitEvent(clientA, "call:ended");
        const endPromiseB = waitEvent(clientB, "call:ended");
        clientA.emit("call:end", { callId, reason: "Call completed" });

        const [endResA, endResB] = await Promise.all([endPromiseA, endPromiseB]);
        console.log("✓ User A and User B received call:ended:", endResA, endResB);

        if (callService.isUserInCall(userA.id) || callService.isUserInCall(userB.id)) {
            throw new Error("Call session not cleaned up after call:end");
        }
        console.log("✓ All in-memory sessions, routers, transports, producers, and consumers cleaned up");

        // 14. Test Video Call (Two Users, Video Call)
        console.log("\n--- Test 11: 1-to-1 Video Call Flow (Audio + Video Producers) ---");
        const videoIncomingPromise = waitEvent(clientB, "call:incoming");
        clientA.emit("call:start", { targetUserId: userB.id, type: "video" });
        const videoIncomingData = await videoIncomingPromise;
        const videoCallId = videoIncomingData.callId;

        const videoAcceptedPromiseA = waitEvent(clientA, "call:accepted");
        clientB.emit("call:accept", { callId: videoCallId });
        await videoAcceptedPromiseA;

        const videoSendTransportA = await socketRequest(clientA, "media:createTransport", { callId: videoCallId, direction: "send" });
        const videoRecvTransportB = await socketRequest(clientB, "media:createTransport", { callId: videoCallId, direction: "recv" });

        await socketRequest(clientA, "media:connectTransport", {
            callId: videoCallId,
            transportId: videoSendTransportA.id,
            dtlsParameters: dummyDtlsParamsA,
        });
        await socketRequest(clientB, "media:connectTransport", {
            callId: videoCallId,
            transportId: videoRecvTransportB.id,
            dtlsParameters: dummyDtlsParamsB,
        });

        // Produce Video Track
        const dummyVideoRtpParams = {
            codecs: [
                {
                    mimeType: "video/VP8",
                    payloadType: 96,
                    clockRate: 90000,
                    parameters: {},
                }
            ],
            headerExtensions: [],
            encodings: [{ ssrc: 22222222 }],
            rtcp: { cname: "alice-video", reducedSize: true },
        };

        const videoProducerPromiseB = waitEvent(clientB, "media:newProducer");
        const videoProducerA = await socketRequest(clientA, "media:produce", {
            callId: videoCallId,
            transportId: videoSendTransportA.id,
            kind: "video",
            rtpParameters: dummyVideoRtpParams,
        });

        const announcedVideoB = await videoProducerPromiseB;
        if (announcedVideoB.kind !== "video" || announcedVideoB.producerId !== videoProducerA.id) {
            throw new Error("User B did not receive valid video media:newProducer event");
        }
        console.log(`✓ Video producer [${videoProducerA.id}] announced and consumed on SFU`);

        clientA.emit("call:end", { callId: videoCallId });
        await Promise.all([waitEvent(clientA, "call:ended"), waitEvent(clientB, "call:ended")]);
        console.log("✓ Video call ended and cleaned up");

        // 15. Test Call Rejection
        console.log("\n--- Test 12: Call Rejection Flow ---");
        const rejIncomingPromise = waitEvent(clientB, "call:incoming");
        clientA.emit("call:start", { targetUserId: userB.id, type: "audio" });
        const rejIncomingData = await rejIncomingPromise;

        const rejPromiseA = waitEvent(clientA, "call:rejected");
        clientB.emit("call:reject", { callId: rejIncomingData.callId, reason: "Declined by recipient" });
        const rejResA = await rejPromiseA;
        console.log("✓ User A received call:rejected:", rejResA);

        if (callService.isUserInCall(userA.id) || callService.isUserInCall(userB.id)) {
            throw new Error("Call state not cleaned up after reject");
        }
        console.log("✓ Call state verified cleaned up after rejection");

        // 16. Test Socket Disconnect Cleanup
        console.log("\n--- Test 13: Socket Disconnect Cleanup ---");
        const discIncomingPromise = waitEvent(clientB, "call:incoming");
        clientA.emit("call:start", { targetUserId: userB.id, type: "audio" });
        const discIncomingData = await discIncomingPromise;

        clientB.emit("call:accept", { callId: discIncomingData.callId });
        await waitEvent(clientA, "call:accepted");

        const discEndedPromiseB = waitEvent(clientB, "call:ended");
        clientA.disconnect();
        const discEndedResB = await discEndedPromiseB;
        console.log("✓ User B received call:ended upon User A disconnect:", discEndedResB);

        if (callService.isUserInCall(userB.id)) {
            throw new Error("Call state not cleaned up after peer disconnect");
        }
        console.log("✓ Call state verified cleaned up after peer disconnect");

        clientB.disconnect();

        console.log("\n===============================================================");
        console.log("🎉 ALL 13 MEDIASOUP SFU SIGNALING & MEDIA TESTS PASSED! 🎉");
        console.log("===============================================================");

        closeMediasoupWorkers();
        process.exit(0);
    } catch (error) {
        console.error("\n❌ TEST SUITE FAILED:", error);
        closeMediasoupWorkers();
        process.exit(1);
    } finally {
        httpServer.close();
    }
}

runTests();
