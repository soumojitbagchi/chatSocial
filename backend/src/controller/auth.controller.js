import userData from "../model/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Pre-computed dummy bcrypt hash (cost 10) to ensure constant-time comparison on unknown users
const DUMMY_HASH = "$2b$10$wT8mQ0K6W9U0g6iFq7D0NuF7UaL/4xU0rR2jXj3jM9jI2FvC.XfK2";

export const login = async (req, res) => {
    const { email, password, username, identifier } = req.body;
    try {
        const loginId = (email || username || identifier || "").toString().trim().toLowerCase();
        if (!loginId || !password) {
            return res.status(400).json({
                message: "Email or username and password are required",
                success: false
            });
        }

        // Find user by either email or username (case-insensitive)
        const isUserExists = await userData.findOne({
            $or: [
                { email: loginId },
                { username: loginId }
            ]
        }).select("+password");

        // Prevent timing attack: always run bcrypt.compare regardless of user existence
        const passwordHash = isUserExists?.password || DUMMY_HASH;
        const isPasswordValid = await bcrypt.compare(password, passwordHash);

        // Return uniform 401 with generic message for both non-existent users and incorrect passwords
        if (!isUserExists || !isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials",
                success: false
            });
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
        return res.status(500).json({
            message: process.env.NODE_ENV === "production" ? "Internal server error" : (error.message || "Internal server error"),
            success: false
        });
    }
};

export const register = async (req, res) => {
    const { email, password, username, name } = req.body;
    try {
        const cleanEmail = email?.toLowerCase().trim();
        const cleanUsername = username?.toLowerCase().trim();
        const cleanName = name?.trim();

        if (!cleanEmail || !cleanUsername || !password || !cleanName) {
            return res.status(400).json({
                message: "All fields (name, email, username, password) are required",
                success: false
            });
        }

        const isUserExists = await userData.findOne({
            $or: [{ email: cleanEmail }, { username: cleanUsername }]
        });

        if (isUserExists) {
            const emailTaken = isUserExists.email === cleanEmail;
            const usernameTaken = isUserExists.username === cleanUsername;

            let message = "User already exists";
            if (emailTaken && usernameTaken) {
                message = "Both this email and username are already registered. Please sign in instead.";
            } else if (emailTaken) {
                message = "This email is already registered. Please sign in or use another email address.";
            } else if (usernameTaken) {
                message = "This username is already taken. Please choose a different username.";
            }

            return res.status(409).json({
                message,
                success: false,
                conflict: emailTaken && usernameTaken ? "both" : emailTaken ? "email" : "username"
            });
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
        return res.status(500).json({
            message: error.message || "Internal server error",
            success: false
        });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await userData.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
            }
        });
    } catch (error) {
        console.error("getMe error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch user session" });
    }
};

export const logout = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });
        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ success: false, message: "Failed to logout" });
    }
};

export default { login, register, getMe, logout };
