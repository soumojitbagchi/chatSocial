import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { io as Client } from "../frontend/node_modules/socket.io-client/build/esm/index.js";
import registerSocketHandler from "./src/sockets/index.js";
import * as callService from "./src/sockets/service/call.service.js";
import * as presenceService from "./src/sockets/service/presence.service.js";

process.env.JWT_KEY = "test_jwt_secret_key_12345";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" },
});
registerSocketHandler(io);

const PORT = 8099;

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

function waitEvent(socket, eventName, timeoutMs = 3000) {
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

async function runTests() {
    console.log("=== STARTING WEBRTC VOICE CALL SIGNALING TEST SUITE ===");

    await new Promise((resolve) => httpServer.listen(PORT, resolve));
    console.log(`Test server running on port ${PORT}`);

    try {
        // 1. Connect Client A and Client B
        const clientA = createClientSocket(tokenA, userA);
        const clientB = createClientSocket(tokenB, userB);

        await Promise.all([
            waitEvent(clientA, "connect"),
            waitEvent(clientB, "connect"),
        ]);
        console.log("✓ Client A and Client B connected");

        // 2. Announce online
        clientA.emit("online");
        clientB.emit("online");
        await new Promise((r) => setTimeout(r, 100));

        if (!presenceService.isUserOnline(userA.id) || !presenceService.isUserOnline(userB.id)) {
            throw new Error("Presence check failed: users should be online");
        }
        console.log("✓ Presence service verified: User A and User B are online");

        // 3. Validation: Prevent calling oneself
        console.log("\n--- Testing Self-Calling Prevention ---");
        const selfCallPromise = waitEvent(clientA, "call-error");
        clientA.emit("call-user", { targetUserId: userA.id, callType: "audio" });
        const selfCallErr = await selfCallPromise;
        if (!selfCallErr.message || !selfCallErr.message.includes("Cannot call yourself")) {
            throw new Error(`Unexpected self-call error: ${JSON.stringify(selfCallErr)}`);
        }
        console.log("✓ Self-call prevented with call-error:", selfCallErr.message);

        // 4. Validation: Offline user rejection
        console.log("\n--- Testing Offline User Call Rejection ---");
        const offlineUserPromise = waitEvent(clientA, "call-rejected");
        clientA.emit("call-user", { targetUserId: "507f1f77bcf86cd799439099", callType: "audio" });
        const offlineErr = await offlineUserPromise;
        if (!offlineErr.reason || !offlineErr.reason.includes("offline")) {
            throw new Error(`Unexpected offline call response: ${JSON.stringify(offlineErr)}`);
        }
        console.log("✓ Call to offline user rejected with call-rejected:", offlineErr.reason);

        // 5. Complete WebRTC Call Flow: User A calls User B
        console.log("\n--- Testing 1-to-1 WebRTC Voice Call Flow ---");
        const incomingPromise = waitEvent(clientB, "incoming-call");
        clientA.emit("call-user", { targetUserId: userB.id, callType: "audio" });
        const incomingData = await incomingPromise;

        console.log("✓ User B received incoming-call:", incomingData);
        if (incomingData.callerId !== userA.id || incomingData.callType !== "audio") {
            throw new Error("Invalid incoming-call payload");
        }

        // 6. Validation: Busy user rejection during active/ringing call
        console.log("\n--- Testing Busy User Call Rejection ---");
        const clientC = createClientSocket(tokenC, userC);
        await waitEvent(clientC, "connect");
        clientC.emit("online");
        await new Promise((r) => setTimeout(r, 50));

        const busyPromise = waitEvent(clientC, "call-rejected");
        clientC.emit("call-user", { targetUserId: userB.id, callType: "audio" });
        const busyErr = await busyPromise;
        if (!busyErr.reason || !busyErr.reason.includes("busy")) {
            throw new Error(`Unexpected busy response: ${JSON.stringify(busyErr)}`);
        }
        console.log("✓ User C calling busy User B rejected with:", busyErr.reason);
        clientC.disconnect();

        // 7. Accept Call
        console.log("\n--- Testing Call Acceptance & SDP / ICE Exchange ---");
        const acceptedPromiseA = waitEvent(clientA, "call-accepted");
        clientB.emit("accept-call", { callerId: userA.id });
        const acceptedDataA = await acceptedPromiseA;
        console.log("✓ User A received call-accepted:", acceptedDataA);

        // 8. SDP Offer Forwarding (User A -> User B)
        const offerPromiseB = waitEvent(clientB, "offer");
        const dummyOffer = { type: "offer", sdp: "v=0\r\no=alice 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 5004 RTP/AVP 0\r\n" };
        clientA.emit("offer", { targetUserId: userB.id, offer: dummyOffer });
        const receivedOfferB = await offerPromiseB;
        if (!receivedOfferB.offer || receivedOfferB.fromUserId !== userA.id) {
            throw new Error("Invalid offer forward payload");
        }
        console.log("✓ User B received WebRTC offer from User A");

        // 9. SDP Answer Forwarding (User B -> User A)
        const answerPromiseA = waitEvent(clientA, "answer");
        const dummyAnswer = { type: "answer", sdp: "v=0\r\no=bob 67890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 5004 RTP/AVP 0\r\n" };
        clientB.emit("answer", { targetUserId: userA.id, answer: dummyAnswer });
        const receivedAnswerA = await answerPromiseA;
        if (!receivedAnswerA.answer || receivedAnswerA.fromUserId !== userB.id) {
            throw new Error("Invalid answer forward payload");
        }
        console.log("✓ User A received WebRTC answer from User B");

        // 10. ICE Candidate Exchange
        const icePromiseB = waitEvent(clientB, "ice-candidate");
        const dummyCandidateA = { candidate: "candidate:1 1 UDP 2130706431 192.168.1.100 5004 typ host", sdpMid: "0", sdpMLineIndex: 0 };
        clientA.emit("ice-candidate", { targetUserId: userB.id, candidate: dummyCandidateA });
        const receivedCandidateB = await icePromiseB;
        if (!receivedCandidateB.candidate || receivedCandidateB.fromUserId !== userA.id) {
            throw new Error("Invalid candidate forward payload on User B");
        }
        console.log("✓ User B received ICE candidate from User A");

        const icePromiseA = waitEvent(clientA, "ice-candidate");
        const dummyCandidateB = { candidate: "candidate:2 1 UDP 2130706431 192.168.1.200 5004 typ host", sdpMid: "0", sdpMLineIndex: 0 };
        clientB.emit("ice-candidate", { targetUserId: userA.id, candidate: dummyCandidateB });
        const receivedCandidateA = await icePromiseA;
        if (!receivedCandidateA.candidate || receivedCandidateA.fromUserId !== userB.id) {
            throw new Error("Invalid candidate forward payload on User A");
        }
        console.log("✓ User A received ICE candidate from User B");

        // 11. End Call
        console.log("\n--- Testing Call Termination ---");
        const endPromiseA = waitEvent(clientA, "call-ended");
        const endPromiseB = waitEvent(clientB, "call-ended");
        clientA.emit("end-call", { targetUserId: userB.id });
        const [endResA, endResB] = await Promise.all([endPromiseA, endPromiseB]);

        console.log("✓ User A and User B received call-ended:", endResA, endResB);

        if (callService.isUserInCall(userA.id) || callService.isUserInCall(userB.id)) {
            throw new Error("Call state not cleaned up after end-call");
        }
        console.log("✓ Call state verified to be completely cleaned up on server");

        // 12. Test Call Rejection
        console.log("\n--- Testing Call Rejection Flow ---");
        const incomingPromise2 = waitEvent(clientB, "incoming-call");
        clientA.emit("call-user", { targetUserId: userB.id, callType: "audio" });
        await incomingPromise2;

        const rejectPromiseA = waitEvent(clientA, "call-rejected");
        clientB.emit("reject-call", { callerId: userA.id, reason: "Declined by user" });
        const rejectResA = await rejectPromiseA;
        console.log("✓ User A received call-rejected:", rejectResA);

        if (callService.isUserInCall(userA.id) || callService.isUserInCall(userB.id)) {
            throw new Error("Call state not cleaned up after reject-call");
        }
        console.log("✓ Call state cleaned up after rejection");

        // 13. Test Disconnect Cleanup
        console.log("\n--- Testing Socket Disconnect Cleanup ---");
        const incomingPromise3 = waitEvent(clientB, "incoming-call");
        clientA.emit("call-user", { targetUserId: userB.id, callType: "audio" });
        await incomingPromise3;
        clientB.emit("accept-call", { callerId: userA.id });
        await waitEvent(clientA, "call-accepted");

        const disconnectEndedPromiseB = waitEvent(clientB, "call-ended");
        clientA.disconnect();
        const discEndedResB = await disconnectEndedPromiseB;
        console.log("✓ User B received call-ended upon User A disconnect:", discEndedResB);

        if (callService.isUserInCall(userB.id)) {
            throw new Error("Call state not cleaned up after peer disconnect");
        }
        console.log("✓ Call state cleaned up after peer disconnect");

        clientB.disconnect();

        console.log("\n🎉 ALL WEBRTC VOICE CALL SIGNALING TESTS PASSED SUCCESSFULLY! 🎉");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ TEST SUITE FAILED:", error);
        process.exit(1);
    } finally {
        httpServer.close();
    }
}

runTests();
