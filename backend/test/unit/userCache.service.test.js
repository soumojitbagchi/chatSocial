import test from "node:test";
import assert from "node:assert/strict";
import { RedisUnavailableError } from "../../src/config/redis.js";
import {
    createUserCache,
    normalizeSearchQuery,
    overlayConnectionPresence,
    personalizeSearchCandidates,
} from "../../src/service/userCache.service.js";

class FakeRedis {
    constructor() {
        this.values = new Map();
        this.ttls = new Map();
        this.commands = [];
        this.failGet = false;
    }

    withAbortSignal() {
        return this;
    }

    async get(key) {
        this.commands.push(["get", key]);
        if (this.failGet) throw new Error("simulated Redis GET failure");
        return this.values.has(key) ? this.values.get(key) : null;
    }

    async mGet(keys) {
        this.commands.push(["mGet", ...keys]);
        return keys.map((key) => this.values.has(key) ? this.values.get(key) : null);
    }

    async setEx(key, ttl, value) {
        this.commands.push(["setEx", key]);
        this.values.set(key, value);
        this.ttls.set(key, ttl);
        return "OK";
    }

    async del(key) {
        this.commands.push(["del", key]);
        return this.values.delete(key) ? 1 : 0;
    }

    async eval(script, { keys }) {
        this.commands.push(["eval", ...keys]);
        return keys.map((key) => {
            const next = Number(this.values.get(key) || 0) + 1;
            this.values.set(key, next.toString());
            return next;
        }).length;
    }
}

const buildCache = (overrides = {}) => {
    const client = overrides.client || new FakeRedis();
    const unhealthy = [];
    const cache = createUserCache({
        getClient: () => client,
        ensureReady: overrides.ensureReady || (() => client),
        onUnhealthy: overrides.onUnhealthy || ((error, options) => unhealthy.push({ error, options })),
        randomInt: (min) => min,
        commandTimeoutMs: 100,
    });
    return { cache, client, unhealthy };
};

const candidate = {
    _id: "507f1f77bcf86cd799439011",
    name: "Alice",
    username: "alice",
    email: "alice@example.test",
    avatar: "",
    about: "Hello",
    password: "must-not-be-cached",
    emailOtp: "123456",
};

test("search candidates are normalized, hashed, allowlisted, and read through once", async () => {
    const { cache, client } = buildCache();
    let loaderCalls = 0;
    const loader = async (query) => {
        loaderCalls += 1;
        assert.equal(query, "alice@example.test");
        return [candidate];
    };

    const first = await cache.getSearchCandidates("  ALICE@EXAMPLE.TEST  ", loader);
    const second = await cache.getSearchCandidates("alice@example.test", loader);

    assert.equal(loaderCalls, 1);
    assert.deepEqual(first, second);
    assert.deepEqual(Object.keys(first.candidates[0]), [
        "id", "name", "username", "email", "avatar", "about",
    ]);

    const searchSet = client.commands.find(([command, key]) => command === "setEx" && key.startsWith("search:"));
    assert.ok(searchSet);
    assert.equal(searchSet[1].includes("alice@example.test"), false);
    assert.equal(client.ttls.get(searchSet[1]), 45);
    assert.equal(client.values.get(searchSet[1]).includes("must-not-be-cached"), false);
    assert.equal(client.values.get(searchSet[1]).includes("123456"), false);
});

test("search normalization bounds Unicode code points", () => {
    const normalized = normalizeSearchQuery(`  ${"😀".repeat(120)}  `);
    assert.equal(Array.from(normalized).length, 100);
});

test("Redis read failures do not invoke the Mongo loader", async () => {
    const client = new FakeRedis();
    client.failGet = true;
    const { cache, unhealthy } = buildCache({ client });
    let loaderCalled = false;

    await assert.rejects(
        cache.getSearchCandidates("alice", async () => {
            loaderCalled = true;
            return [];
        }),
        RedisUnavailableError
    );

    assert.equal(loaderCalled, false);
    assert.equal(unhealthy.length, 1);
});

test("auth profile priming stores only the allowlisted fields", async () => {
    const { cache, client } = buildCache();
    await cache.primeAuthProfile({
        ...candidate,
        isEmailVerified: true,
        phone: "+10000000000",
        googleId: "google-secret",
        emailVerificationToken: "verification-secret",
    });

    const entry = [...client.values.entries()].find(([key]) => key.startsWith("auth-profile:"));
    assert.ok(entry);
    const value = JSON.parse(entry[1]);
    assert.deepEqual(Object.keys(value), [
        "id", "name", "email", "username", "isEmailVerified", "avatar", "about", "phone",
    ]);
    assert.equal(JSON.stringify(value).includes("google-secret"), false);
    assert.equal(JSON.stringify(value).includes("verification-secret"), false);
});

test("connection snapshots never cache online state and overlay presence dynamically", async () => {
    const { cache } = buildCache();
    const snapshot = await cache.getConnectionSnapshot("507f1f77bcf86cd799439010", async () => ({
        contacts: [{ ...candidate, roomId: "507f1f77bcf86cd799439012", online: false }],
        pendingIncoming: [],
        pendingOutgoing: [],
    }));

    assert.equal("online" in snapshot.contacts[0], false);
    assert.equal(overlayConnectionPresence(snapshot, () => true).contacts[0].online, true);
    assert.equal(overlayConnectionPresence(snapshot, () => false).contacts[0].online, false);
});

test("search personalization derives relationship state without caching presence", () => {
    const snapshot = {
        contacts: [{ ...candidate, id: candidate._id, roomId: "507f1f77bcf86cd799439012" }],
        pendingIncoming: [{ id: "507f1f77bcf86cd799439013" }],
        pendingOutgoing: [{ id: "507f1f77bcf86cd799439014" }],
    };
    const results = personalizeSearchCandidates({
        candidates: [
            { ...candidate, id: candidate._id },
            { ...candidate, id: "507f1f77bcf86cd799439013" },
            { ...candidate, id: "507f1f77bcf86cd799439014" },
        ],
        snapshot,
        currentUserId: "507f1f77bcf86cd799439010",
        isOnline: (id) => id === candidate._id,
        limit: 20,
    });

    assert.deepEqual(results.map(({ connectionStatus }) => connectionStatus), [
        "connected", "pending_received", "pending_sent",
    ]);
    assert.equal(results[0].roomId, "507f1f77bcf86cd799439012");
    assert.equal(results[0].online, true);
});

test("relationship epoch bumps isolate stale connection entries", async () => {
    const { cache, client } = buildCache();
    const userId = "507f1f77bcf86cd799439010";
    let loads = 0;
    const loader = async () => {
        loads += 1;
        return { contacts: [], pendingIncoming: [], pendingOutgoing: [] };
    };

    await cache.getConnectionSnapshot(userId, loader);
    await cache.invalidateRelationships([userId]);
    await cache.getConnectionSnapshot(userId, loader);

    assert.equal(loads, 2);
    const epochCommand = client.commands.find(([command]) => command === "eval");
    assert.ok(epochCommand, "epoch bumps use one abortable Redis command");
    const connectionKeys = [...client.values.keys()].filter((key) => key.startsWith("connections:"));
    assert.equal(connectionKeys.length, 2);
    assert.notEqual(connectionKeys[0], connectionKeys[1]);
});

test("coherent mutation prevents writes on pre-invalidation failure", async () => {
    const { cache } = buildCache();
    let mutated = false;

    await assert.rejects(
        cache.runCoherentMutation({
            invalidate: async () => { throw new RedisUnavailableError(); },
            mutate: async () => { mutated = true; },
        }),
        RedisUnavailableError
    );
    assert.equal(mutated, false);
});

test("coherent mutation preserves a committed result when post-invalidation fails", async () => {
    const unhealthy = [];
    const { cache } = buildCache({
        onUnhealthy: (error, options) => unhealthy.push({ error, options }),
    });
    let invalidations = 0;

    const result = await cache.runCoherentMutation({
        invalidate: async () => {
            invalidations += 1;
            if (invalidations === 2) throw new RedisUnavailableError();
        },
        mutate: async () => ({ committed: true }),
    });

    assert.deepEqual(result, { committed: true });
    assert.equal(unhealthy.length, 1);
    assert.equal(unhealthy[0].options.staleRisk, true);
});
