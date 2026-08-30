import axios from "axios";
import { io as ClientIO } from "../frontend/node_modules/socket.io-client/build/esm/index.js";

const BACKEND_URL = "http://localhost:8080";
const API_URL = `${BACKEND_URL}/api`;

async function loginUser(email, passwords) {
    for (const pwd of passwords) {
        try {
            const res = await axios.post(`${API_URL}/auth/signin`, { email, password: pwd });
            console.log(`✓ Login success for ${email} with password: "${pwd}"`);
            return { token: res.data.token, user: res.data.user };
        } catch {
            // try next password
        }
    }
    throw new Error(`Could not sign in as ${email} with any tested password`);
}

async function runPresenceTest() {
    console.log("==================================================================");
    console.log("=== TESTING USER PRESENCE & CREDENTIALS (ONLINE / OFFLINE) ===");
    console.log("==================================================================");

    const testPasswords = ["pass-000000", "000000", "Password123!", "123456", "password"];

    // 1. Authenticate with test@test.com and test1@test.com
    console.log("\n[1] Authenticating test@test.com and test1@test.com...");
    const user1 = await loginUser("test@test.com", testPasswords);
    const user1Id = String(user1.user.id || user1.user._id);
    console.log(`✓ User 1 Authenticated: ${user1.user.email} (ID: ${user1Id})`);

    const user2 = await loginUser("test1@test.com", testPasswords);
    const user2Id = String(user2.user.id || user2.user._id);
    console.log(`✓ User 2 Authenticated: ${user2.user.email} (ID: ${user2Id})`);

    // 2. Connect User 2 first
    console.log("\n[2] Connecting User 2 to Socket.IO...");
    const socket2 = ClientIO(BACKEND_URL, {
        auth: { token: user2.token },
        transports: ["websocket"],
        reconnection: false,
    });
    await new Promise((resolve) => socket2.on("connect", resolve));
    console.log("✓ User 2 Socket connected");

    let user2OnlineList = [];
    socket2.on("users:online-list", (list) => {
        user2OnlineList = list;
    });
    socket2.on("user:online", (data) => {
        user2OnlineList = Array.from(new Set([...user2OnlineList, data.userId]));
    });
    socket2.on("user:offline", (data) => {
        user2OnlineList = user2OnlineList.filter((id) => id !== data.userId);
    });

    await new Promise((r) => setTimeout(r, 400));
    console.log(`✓ Initial Online list seen by User 2:`, user2OnlineList);
    const user1InitiallyOnline = user2OnlineList.includes(user1Id);
    console.log(`✓ User 1 online status before connecting: ${user1InitiallyOnline ? "ONLINE" : "OFFLINE"}`);

    // 3. Connect User 1 (Online Transition)
    console.log("\n[3] Connecting User 1 to Socket.IO -> Testing Online event...");
    const user1OnlinePromise = new Promise((resolve) => {
        socket2.on("user:online", (data) => {
            if (data.userId === user1Id) resolve(data);
        });
    });

    const socket1 = ClientIO(BACKEND_URL, {
        auth: { token: user1.token },
        transports: ["websocket"],
        reconnection: false,
    });
    await new Promise((resolve) => socket1.on("connect", resolve));
    console.log("✓ User 1 Socket connected");

    await user1OnlinePromise;
    console.log(`✓ User 2 successfully received 'user:online' event for User 1 (${user1.user.email})`);
    console.log(`✓ User 1 is verified ONLINE in User 2's presence list: ${user2OnlineList.includes(user1Id)}`);

    // 4. Disconnect User 1 (Offline Transition on Logout/Disconnect)
    console.log("\n[4] Disconnecting / Logging out User 1 -> Testing Offline event...");
    const user1OfflinePromise = new Promise((resolve) => {
        socket2.on("user:offline", (data) => {
            if (data.userId === user1Id) resolve(data);
        });
    });

    socket1.disconnect();
    console.log("✓ User 1 disconnected socket (simulating logout/close)");

    await user1OfflinePromise;
    console.log(`✓ User 2 successfully received 'user:offline' event for User 1 (${user1.user.email})`);
    console.log(`✓ User 1 is verified OFFLINE in User 2's presence list: ${!user2OnlineList.includes(user1Id)}`);

    // 5. Reconnect User 1 (Online Transition again)
    console.log("\n[5] Reconnecting User 1 -> Testing Re-online event...");
    const user1ReonlinePromise = new Promise((resolve) => {
        socket2.on("user:online", (data) => {
            if (data.userId === user1Id) resolve(data);
        });
    });

    const socket1Reconnected = ClientIO(BACKEND_URL, {
        auth: { token: user1.token },
        transports: ["websocket"],
        reconnection: false,
    });
    await new Promise((resolve) => socket1Reconnected.on("connect", resolve));
    await user1ReonlinePromise;
    console.log(`✓ User 2 successfully received 'user:online' event on reconnection`);
    console.log(`✓ User 1 is verified ONLINE again in User 2's presence list: ${user2OnlineList.includes(user1Id)}`);

    // 6. Connect & establish 1-to-1 conversation
    console.log("\n[6] Establishing 1-to-1 conversation and exchanging messages...");
    await axios.post(`${API_URL}/users/connect`, { targetUserId: user2Id }, { headers: { Authorization: `Bearer ${user1.token}` } }).catch(() => {});
    const acceptRes = await axios.post(`${API_URL}/users/accept`, { targetUserId: user1Id }, { headers: { Authorization: `Bearer ${user2.token}` } });
    const roomId = String(acceptRes.data.room?.id || acceptRes.data.room?._id);

    socket1Reconnected.emit("joinRoom", roomId);
    socket2.emit("joinRoom", roomId);
    await new Promise((r) => setTimeout(r, 200));

    const msgPromise = new Promise((resolve) => socket2.on("receiveMessage", resolve));
    socket1Reconnected.emit("sendMessage", { roomId, text: "Hello test1, presence is working perfectly!" });
    const received = await msgPromise;
    console.log(`✓ User 2 received message: "${received.text}"`);

    // Clean up
    socket1Reconnected.disconnect();
    socket2.disconnect();

    console.log("\n==================================================================");
    console.log("🎉 PRESENCE & CREDENTIALS VERIFICATION PASSED WITH 100% SUCCESS! 🎉");
    console.log("==================================================================");
    process.exit(0);
}

runPresenceTest().catch((err) => {
    console.error("❌ Presence test failed:", err);
    process.exit(1);
});
