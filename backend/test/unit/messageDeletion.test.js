import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { deleteMessage } from "../../src/service/message.service.js";
import Message from "../../src/model/message.model.js";
import Room from "../../src/model/room.model.js";

test("Message Deletion Flow - Scenario 1: Sender deletes forever (forEveryone)", async () => {
    const senderId = new mongoose.Types.ObjectId();
    const messageId = new mongoose.Types.ObjectId();
    const roomId = new mongoose.Types.ObjectId();

    const fakeMessage = {
        _id: messageId,
        userId: senderId,
        roomId,
        text: "Hello everyone",
        deleted: false,
        deletedFor: [],
        save: async function () { return this; },
    };

    const origFindById = Message.findById;
    const origRoomFindById = Room.findById;

    fakeMessage.populate = () => ({
        lean: async () => fakeMessage,
    });

    Message.findById = (id) => {
        if (id.toString() === messageId.toString()) {
            return fakeMessage;
        }
        return null;
    };

    Room.findById = async () => ({
        _id: roomId,
        isDirect: true,
        members: [senderId],
    });

    try {
        const result = await deleteMessage({
            messageId,
            userId: senderId,
            deleteType: "forEveryone",
        });

        assert.equal(result.deleteType, "forEveryone");
        assert.equal(fakeMessage.deleted, true);
        assert.equal(fakeMessage.text, "This message was deleted");
    } finally {
        Message.findById = origFindById;
        Room.findById = origRoomFindById;
    }
});

test("Message Deletion Flow - Scenario 2: Sender deletes for me only", async () => {
    const senderId = new mongoose.Types.ObjectId();
    const messageId = new mongoose.Types.ObjectId();
    const roomId = new mongoose.Types.ObjectId();

    const fakeMessage = {
        _id: messageId,
        userId: senderId,
        roomId,
        text: "Secret note",
        deleted: false,
        deletedFor: [],
        save: async function () { return this; },
    };

    const origFindById = Message.findById;
    const origRoomFindById = Room.findById;

    Message.findById = (id) => {
        if (id.toString() === messageId.toString()) {
            return {
                ...fakeMessage,
                populate: () => ({
                    lean: async () => ({ ...fakeMessage }),
                }),
            };
        }
        return null;
    };

    Room.findById = async () => ({
        _id: roomId,
        isDirect: true,
        members: [senderId],
    });

    try {
        const result = await deleteMessage({
            messageId,
            userId: senderId,
            deleteType: "forMe",
        });

        assert.equal(result.deleteType, "forMe");
        assert.equal(result.deletedForUserId, senderId.toString());
        assert.equal(fakeMessage.deleted, false); // Message is NOT deleted for others
        assert.equal(fakeMessage.deletedFor.length, 1);
        assert.equal(fakeMessage.deletedFor[0].toString(), senderId.toString());
    } finally {
        Message.findById = origFindById;
        Room.findById = origRoomFindById;
    }
});

test("Message Deletion Flow - Scenario 3: Reader deletes for me", async () => {
    const senderId = new mongoose.Types.ObjectId();
    const readerId = new mongoose.Types.ObjectId();
    const messageId = new mongoose.Types.ObjectId();
    const roomId = new mongoose.Types.ObjectId();

    const fakeMessage = {
        _id: messageId,
        userId: senderId,
        roomId,
        text: "Message to reader",
        deleted: false,
        deletedFor: [],
        save: async function () { return this; },
    };

    const origFindById = Message.findById;
    const origRoomFindById = Room.findById;

    Message.findById = (id) => {
        if (id.toString() === messageId.toString()) {
            return {
                ...fakeMessage,
                populate: () => ({
                    lean: async () => ({ ...fakeMessage }),
                }),
            };
        }
        return null;
    };

    Room.findById = async () => ({
        _id: roomId,
        isDirect: true,
        members: [senderId, readerId],
    });

    try {
        const result = await deleteMessage({
            messageId,
            userId: readerId,
            deleteType: "forMe",
        });

        assert.equal(result.deleteType, "forMe");
        assert.equal(result.deletedForUserId, readerId.toString());
        assert.equal(fakeMessage.deleted, false); // Not deleted for sender
        assert.equal(fakeMessage.deletedFor.length, 1);
        assert.equal(fakeMessage.deletedFor[0].toString(), readerId.toString());
    } finally {
        Message.findById = origFindById;
        Room.findById = origRoomFindById;
    }
});

test("Message Deletion Flow - Scenario 4: Reader cannot delete forever (forEveryone)", async () => {
    const senderId = new mongoose.Types.ObjectId();
    const readerId = new mongoose.Types.ObjectId();
    const messageId = new mongoose.Types.ObjectId();
    const roomId = new mongoose.Types.ObjectId();

    const fakeMessage = {
        _id: messageId,
        userId: senderId,
        roomId,
        text: "Sender message",
        deleted: false,
        deletedFor: [],
        save: async function () { return this; },
    };

    const origFindById = Message.findById;
    const origRoomFindById = Room.findById;

    Message.findById = (id) => {
        if (id.toString() === messageId.toString()) {
            return {
                ...fakeMessage,
                populate: () => ({
                    lean: async () => ({ ...fakeMessage }),
                }),
            };
        }
        return null;
    };

    Room.findById = async () => ({
        _id: roomId,
        isDirect: true,
        members: [senderId, readerId],
    });

    try {
        await assert.rejects(
            () => deleteMessage({
                messageId,
                userId: readerId,
                deleteType: "forEveryone",
            }),
            /Unauthorized: You can only delete forever your own messages/
        );
        // Message should NOT be modified
        assert.equal(fakeMessage.deleted, false);
    } finally {
        Message.findById = origFindById;
        Room.findById = origRoomFindById;
    }
});

test("Message Deletion Flow - Scenario 5: Non-participant cannot delete forMe", async () => {
    const senderId = new mongoose.Types.ObjectId();
    const strangerId = new mongoose.Types.ObjectId();
    const messageId = new mongoose.Types.ObjectId();
    const roomId = new mongoose.Types.ObjectId();

    const fakeMessage = {
        _id: messageId,
        userId: senderId,
        roomId,
        text: "Private message",
        deleted: false,
        deletedFor: [],
        save: async function () { return this; },
    };

    const origFindById = Message.findById;
    const origRoomFindById = Room.findById;

    Message.findById = () => ({
        ...fakeMessage,
        populate: () => ({ lean: async () => fakeMessage }),
    });

    Room.findById = async () => ({
        _id: roomId,
        isDirect: true,
        members: [senderId], // Stranger is NOT a member
    });

    try {
        await assert.rejects(
            () => deleteMessage({
                messageId,
                userId: strangerId,
                deleteType: "forMe",
            }),
            /Unauthorized: You must be a chat participant to delete this message for yourself/
        );
    } finally {
        Message.findById = origFindById;
        Room.findById = origRoomFindById;
    }
});
