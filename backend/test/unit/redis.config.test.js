import test from "node:test";
import assert from "node:assert/strict";
import {
    buildRedisOptions,
    RedisConfigurationError,
} from "../../src/config/redis.js";

test("buildRedisOptions accepts a Redis URL without exposing it in validation errors", () => {
    const options = buildRedisOptions({
        NODE_ENV: "test",
        REDIS_URL: "rediss://cache-user:cache-secret@example.test:6380/1",
    });

    assert.equal(options.url, "rediss://cache-user:cache-secret@example.test:6380/1");
    assert.equal(options.keyPrefix, "chatsocial:test:user-cache:v1:");
    assert.equal(options.disableOfflineQueue, true);
    assert.equal(options.socket.connectTimeout, 5000);
});

test("buildRedisOptions accepts split credentials with optional TLS and username", () => {
    const options = buildRedisOptions({
        NODE_ENV: "production",
        REDIS_HOST: "cache.internal",
        REDIS_PORT: "6380",
        REDIS_PASSWORD: "cache-secret",
        REDIS_USERNAME: "cache-user",
        REDIS_TLS: "true",
        REDIS_KEY_PREFIX: "chatsocial:production:users:v2",
    });

    assert.equal(options.username, "cache-user");
    assert.equal(options.password, "cache-secret");
    assert.equal(options.socket.host, "cache.internal");
    assert.equal(options.socket.port, 6380);
    assert.equal(options.socket.tls, true);
    assert.equal(options.keyPrefix, "chatsocial:production:users:v2:");
});

test("buildRedisOptions defaults split credentials to plain TCP", () => {
    const options = buildRedisOptions({
        REDIS_HOST: "127.0.0.1",
        REDIS_PORT: "6379",
        REDIS_PASSWORD: "cache-secret",
    });

    assert.equal(options.socket.tls, false);
});

test("buildRedisOptions rejects unsupported URLs and invalid booleans", () => {
    assert.throws(
        () => buildRedisOptions({ REDIS_URL: "https://secret@example.test" }),
        RedisConfigurationError
    );
    assert.throws(
        () => buildRedisOptions({
            REDIS_HOST: "cache.internal",
            REDIS_PORT: "6379",
            REDIS_PASSWORD: "do-not-print-this",
            REDIS_TLS: "yes",
        }),
        (error) => {
            assert.equal(error instanceof RedisConfigurationError, true);
            assert.equal(error.message.includes("do-not-print-this"), false);
            return true;
        }
    );
});

test("buildRedisOptions requires complete split configuration and a safe prefix", () => {
    assert.throws(
        () => buildRedisOptions({ REDIS_PORT: "6379", REDIS_PASSWORD: "secret" }),
        /REDIS_HOST is required/
    );
    assert.throws(
        () => buildRedisOptions({
            REDIS_HOST: "cache.internal",
            REDIS_PORT: "not-a-port",
            REDIS_PASSWORD: "secret",
        }),
        /REDIS_PORT/
    );
    assert.throws(
        () => buildRedisOptions({
            REDIS_HOST: "cache.internal",
            REDIS_PORT: "6379",
            REDIS_PASSWORD: "secret",
            REDIS_KEY_PREFIX: "unsafe prefix",
        }),
        /REDIS_KEY_PREFIX/
    );
});
