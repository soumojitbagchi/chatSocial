import axios from "axios";

const BACKEND_URL = "http://localhost:8080";
const API_URL = `${BACKEND_URL}/api`;

async function testAvatarPersistence() {
    console.log("==================================================================");
    console.log("=== TESTING AVATAR PERSISTENCE & HARD REFRESH HYDRATION ===");
    console.log("==================================================================");

    // 1. Login as test@test.com
    console.log("\n[1] Logging in as test@test.com...");
    const loginRes = await axios.post(`${API_URL}/auth/signin`, {
        email: "test@test.com",
        password: "pass-000000",
    });
    const token = loginRes.data.token;
    const userId = String(loginRes.data.user.id || loginRes.data.user._id);
    console.log(`✓ Logged in (User ID: ${userId})`);

    // 2. Set custom avatar via PUT /api/user/profile
    const newAvatarUrl = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&t=${Date.now()}`;
    const newAbout = "Senior Developer specializing in frontend architecture ⚡";
    console.log(`\n[2] Updating profile with custom avatar URL: "${newAvatarUrl}"...`);
    const updateRes = await axios.put(
        `${API_URL}/user/profile`,
        {
            name: "Test User",
            avatar: newAvatarUrl,
            about: newAbout,
        },
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    if (!updateRes.data.success || updateRes.data.data.avatar !== newAvatarUrl) {
        throw new Error(`Profile update failed: expected avatar "${newAvatarUrl}", got "${updateRes.data.data?.avatar}"`);
    }
    console.log(`✓ Profile updated successfully on backend`);

    // 3. Simulate browser hard refresh (GET /api/auth/me)
    console.log("\n[3] Simulating browser hard refresh -> invoking GET /api/auth/me...");
    const meRes = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!meRes.data.success || !meRes.data.user) {
        throw new Error("GET /api/auth/me failed");
    }

    const fetchedAvatar = meRes.data.user.avatar;
    const fetchedAbout = meRes.data.user.about;
    console.log(`✓ GET /api/auth/me returned avatar: "${fetchedAvatar}"`);
    console.log(`✓ GET /api/auth/me returned about: "${fetchedAbout}"`);

    if (fetchedAvatar !== newAvatarUrl) {
        throw new Error(`Hard refresh persistence failure: expected avatar "${newAvatarUrl}", but /api/auth/me returned "${fetchedAvatar}"`);
    }
    console.log("✓ VERIFIED: Current user preserves custom avatar after hard refresh (GET /api/auth/me)");

    // 4. Verify other users see the updated avatar via search
    console.log("\n[4] Verifying other users see the updated avatar via search...");
    const otherUserLogin = await axios.post(`${API_URL}/auth/signin`, {
        email: "test1@test.com",
        password: "000000",
    });
    const otherToken = otherUserLogin.data.token;

    const searchRes = await axios.get(`${API_URL}/users/search?q=test@test.com`, {
        headers: { Authorization: `Bearer ${otherToken}` },
    });
    const foundUser = searchRes.data.data.find((u) => u.id === userId || u.email === "test@test.com");
    if (!foundUser) throw new Error("Peer could not find updated user in search");
    console.log(`✓ Peer search returned avatar for user: "${foundUser.avatar}"`);

    if (foundUser.avatar !== newAvatarUrl) {
        throw new Error(`Peer avatar mismatch: expected "${newAvatarUrl}", got "${foundUser.avatar}"`);
    }
    console.log("✓ VERIFIED: Peer users see the exact same custom avatar");

    console.log("\n==================================================================");
    console.log("🎉 AVATAR PERSISTENCE & HARD REFRESH TEST PASSED 100%! 🎉");
    console.log("==================================================================");
    process.exit(0);
}

testAvatarPersistence().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
