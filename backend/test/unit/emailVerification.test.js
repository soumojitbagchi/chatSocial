import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { verifyUserUsingEmail } from "../../src/controller/auth.controller.js";
import userData from "../../src/model/user.model.js";

test("Email Verification Flow - Scenario 1: Verify user using valid token", async () => {
    const fakeUserId = new mongoose.Types.ObjectId();
    const token = "valid-test-token-12345";
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    const fakeUser = {
        _id: fakeUserId,
        name: "Test User 1",
        email: "test1@example.com",
        username: "testuser1",
        isEmailVerified: false,
        emailVerificationToken: token,
        emailVerificationExpires: expires,
        save: async function () { this.saved = true; return this; },
    };

    const origFindOne = userData.findOne;
    userData.findOne = async (query) => {
        if (query.emailVerificationToken === token) return fakeUser;
        return null;
    };

    try {
        const result = await verifyUserUsingEmail({ token });
        assert.equal(result.isEmailVerified, true);
        assert.equal(result.email, "test1@example.com");
        assert.equal(fakeUser.isEmailVerified, true);
        assert.equal(fakeUser.emailVerificationToken, null);
    } finally {
        userData.findOne = origFindOne;
    }
});

test("Email Verification Flow - Scenario 2: Verify user using valid OTP", async () => {
    const fakeUserId = new mongoose.Types.ObjectId();
    const otp = "123456";
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    const fakeUser = {
        _id: fakeUserId,
        name: "Test User 2",
        email: "test2@example.com",
        username: "testuser2",
        isEmailVerified: false,
        emailOtp: otp,
        emailOtpExpires: expires,
        save: async function () { this.saved = true; return this; },
    };

    const origFindOne = userData.findOne;
    userData.findOne = async (query) => {
        if (query.emailOtp === otp && query.email === "test2@example.com") return fakeUser;
        return null;
    };

    try {
        const result = await verifyUserUsingEmail({ email: "test2@example.com", otp });
        assert.equal(result.isEmailVerified, true);
        assert.equal(result.email, "test2@example.com");
        assert.equal(fakeUser.isEmailVerified, true);
        assert.equal(fakeUser.emailOtp, null);
    } finally {
        userData.findOne = origFindOne;
    }
});

test("Email Verification Flow - Scenario 3: Rejects email-only verification without OTP/token", async () => {
    const origFindOne = userData.findOne;
    let findOneCalled = false;
    userData.findOne = async () => {
        findOneCalled = true;
        return null;
    };

    try {
        await assert.rejects(
            () => verifyUserUsingEmail({ email: "direct@example.com" }),
            /Verification token or OTP is required/
        );
        assert.equal(findOneCalled, false);
    } finally {
        userData.findOne = origFindOne;
    }
});

test("Email Verification Flow - Scenario 4: Rejects expired or invalid token/OTP", async () => {
    const origFindOne = userData.findOne;
    userData.findOne = async () => null;

    try {
        await assert.rejects(
            () => verifyUserUsingEmail({ token: "expired-or-invalid" }),
            /Invalid or expired verification code \/ link/
        );

        await assert.rejects(
            () => verifyUserUsingEmail({ email: "test@example.com", otp: "000000" }),
            /Invalid or expired verification code \/ link/
        );
    } finally {
        userData.findOne = origFindOne;
    }
});

test("Email Verification Flow - Scenario 5: Rejects when no parameters are provided", async () => {
    await assert.rejects(
        () => verifyUserUsingEmail({}),
        /Verification token or OTP is required/
    );
});
