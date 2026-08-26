import userData from "../model/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
    const { email, password, username, identifier } = req.body;
    try {
        const loginId = (email || username || identifier || "").toString().trim().toLowerCase();
        if (!loginId) {
            return res.status(400).json({ message: "Email or username is required", success: false });
        }

        // Find user by either email or username (case-insensitive)
        const isUserExists = await userData.findOne({
            $or: [
                { email: loginId },
                { username: loginId }
            ]
        }).select("+password");

        if (!isUserExists) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        const isPasswordValid = await bcrypt.compare(password, isUserExists.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password", success: false });
        }

        if (!process.env.JWT_KEY) {
            throw new Error("JWT_KEY environment variable is not defined");
        }

        const token = jwt.sign(
            { id: isUserExists._id, email: isUserExists.email, username: isUserExists.username },
            process.env.JWT_KEY,
            { expiresIn: "24h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            message: "Login successful",
            success: true,
            user: {
                id: isUserExists._id,
                name: isUserExists.name,
                email: isUserExists.email,
                username: isUserExists.username,
            },
            token
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: error.message || "Internal server error", success: false });
    }
};

export const register = async (req, res) => {
    const { email, password, username, name } = req.body;
    try {
        const cleanEmail = email?.toLowerCase().trim();
        const cleanUsername = username?.toLowerCase().trim();
        const cleanName = name?.trim();

        const isUserExists = await userData.findOne({
            $or: [{ email: cleanEmail }, { username: cleanUsername }]
        });

        if (isUserExists) {
            const field = isUserExists.email === cleanEmail ? "Email" : "Username";
            return res.status(409).json({ message: `${field} already in use`, success: false });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userData.create({
            email: cleanEmail,
            password: hashedPassword,
            username: cleanUsername,
            name: cleanName
        });

        if (!process.env.JWT_KEY) {
            throw new Error("JWT_KEY environment variable is not defined");
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, username: user.username },
            process.env.JWT_KEY,
            { expiresIn: "24h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(201).json({
            message: "User created successfully",
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
            },
            token
        });
    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ message: error.message || "Internal server error", success: false });
    }
};
