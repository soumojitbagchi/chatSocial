import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { toCallHistoryDto, MISSED_STATUSES } from "../../src/service/callLog.service.js";

const receiverId = new mongoose.Types.ObjectId();
const callerId = new mongoose.Types.ObjectId();

const baseRecord = {
    _id: new mongoose.Types.ObjectId(),
    callId: "call_123",
    caller: { _id: callerId, name: "Alice", username: "alice", avatar: "" },
    receiver: { _id: receiverId, name: "Bob", username: "bob", avatar: "" },
    type: "audio",
    duration: 65,
    createdAt: new Date("2026-01-01T10:00:00Z"),
    startedAt: new Date("2026-01-01T10:00:00Z"),
};

test("missed statuses land in the missed section", () => {
    assert.deepEqual([...MISSED_STATUSES].sort(), ["busy", "failed", "missed", "rejected"]);
});

test("unseen missed call for receiver is red (seen=false)", () => {
    const dto = toCallHistoryDto(
        { ...baseRecord, status: "missed", seenBy: [callerId] },
        receiverId
    );
    assert.equal(dto.direction, "missed");
    assert.equal(dto.isMissed, true);
    assert.equal(dto.seen, false);
    assert.equal(dto.status, "missed");
});

test("seen missed call is no longer red", () => {
    const dto = toCallHistoryDto(
        { ...baseRecord, status: "rejected", seenBy: [callerId, receiverId] },
        receiverId
    );
    assert.equal(dto.direction, "missed");
    assert.equal(dto.seen, true);
});

test("old docs without seenBy are treated as unseen", () => {
    const { seenBy, ...withoutSeen } = { ...baseRecord, status: "missed" };
    void seenBy;
    const dto = toCallHistoryDto(withoutSeen, receiverId);
    assert.equal(dto.seen, false);
});

test("completed incoming call is never red", () => {
    const dto = toCallHistoryDto(
        { ...baseRecord, status: "completed", seenBy: [callerId] },
        receiverId
    );
    assert.equal(dto.direction, "incoming");
    assert.equal(dto.isMissed, false);
    assert.equal(dto.seen, true);
});

test("caller always sees outgoing direction", () => {
    const dto = toCallHistoryDto(
        { ...baseRecord, status: "missed", seenBy: [] },
        callerId
    );
    assert.equal(dto.direction, "outgoing");
    assert.equal(dto.isMissed, false);
    assert.equal(dto.seen, true);
});
