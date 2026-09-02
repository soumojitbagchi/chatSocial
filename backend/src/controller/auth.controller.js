import userData from "../model/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail, sendWelcomeEmail } from "../service/email.service.js";
import { OAuth2Client } from "google-auth-library";

const getGoogleClientId = () =>
    process.env.GOOGLE_AUTH_CLIENT_ID || "376321319198-q3d6qiqphar9vdcosecul7f6taqpr9nb.apps.googleusercontent.com";

const getGoogleClient = () => new OAuth2Client(getGoogleClientId());

const issueSession = (res, user) => {
    if (!process.env.JWT_KEY) {
        throw new Error("JWT_KEY environment variable is not defined");
    }

    const token = jwt.sign(
        { id: user._id, email: user.email, username: user.username },
        process.env.JWT_KEY,
        { expiresIn: "24h" }
    );

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
    });

    return token;
};
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

        const isProd = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
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
                isEmailVerified: Boolean(isUserExists.isEmailVerified),
                avatar: isUserExists.avatar || "",
                about: isUserExists.about || "",
                phone: isUserExists.phone || "",
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
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);

        const user = await userData.create({
            email: cleanEmail,
            password: hashedPassword,
            username: cleanUsername,
            name: cleanName,
            isEmailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpires,
            emailOtp,
            emailOtpExpires: emailVerificationExpires,
        });

        void sendVerificationEmail({
            to: user.email,
            name: user.name,
            verificationToken,
            otp: emailOtp,
        });
        if (!process.env.JWT_KEY) {
            throw new Error("JWT_KEY environment variable is not defined");
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, username: user.username },
            process.env.JWT_KEY,
            { expiresIn: "24h" }
        );

        const isProd = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
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
                isEmailVerified: false,
                avatar: user.avatar || "",
                about: user.about || "",
                phone: user.phone || "",
            },
        });
    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            message: error.message || "Internal server error",
            success: false
        });
    }
};
export const googleAuth = async (req, res) => {
    try {
        const credential = req.body?.credential;
        if (!credential || typeof credential !== "string") {
            return res.status(400).json({
                success: false,
                message: "Google credential is required",
            });
        }

        const clientId = getGoogleClientId();
        const ticket = await getGoogleClient().verifyIdToken({
            idToken: credential,
            audience: clientId,
        });
        const payload = ticket.getPayload();

        if (!payload?.sub || !payload.email || payload.email_verified !== true) {
            return res.status(401).json({
                success: false,
                message: "Google account email is not verified",
            });
        }

        const email = payload.email.trim().toLowerCase();
        let user = await userData.findOne({
            $or: [{ googleId: payload.sub }, { email }],
        });

        if (!user) {
            const localPart = email.split("@")[0] || "google_user";
            const baseUsername = localPart
                .toLowerCase()
                .replace(/[^a-z0-9_.]/g, "_")
                .slice(0, 24) || "google_user";
            let username = baseUsername;
            let suffix = 1;

            while (await userData.exists({ username })) {
                username = `${baseUsername.slice(0, 20)}_${suffix}`;
                suffix += 1;
            }

            const randomPassword = crypto.randomBytes(32).toString("hex");
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            user = await userData.create({
                name: payload.name?.trim() || username,
                email,
                username,
                password: hashedPassword,
                avatar: payload.picture || "",
                googleId: payload.sub,
                authProvider: "google",
                isEmailVerified: true,
            });
        } else {
            user.googleId = payload.sub;
            user.authProvider = "google";
            user.isEmailVerified = true;
            user.emailVerificationToken = null;
            user.emailVerificationExpires = null;
            user.emailOtp = null;
            user.emailOtpExpires = null;
            if (!user.avatar && payload.picture) {
                user.avatar = payload.picture;
            }
            await user.save();
        }

        const token = issueSession(res, user);

        return res.status(200).json({
            success: true,
            message: "Google sign-in successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                isEmailVerified: true,
                avatar: user.avatar || "",
                about: user.about || "",
                phone: user.phone || "",
            },
            token,
        });
    } catch (error) {
        console.error("Google authentication error:", error);
        return res.status(401).json({
            success: false,
            message: "Google authentication failed. Please try again.",
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
                isEmailVerified: Boolean(user.isEmailVerified),
                avatar: user.avatar || "",
                about: user.about || "",
                phone: user.phone || "",
            }
        });
    } catch (error) {
        console.error("getMe error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch user session" });
    }
};

export const logout = async (req, res) => {
    try {
        const isProd = process.env.NODE_ENV === "production";
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax"
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


export const sendVerificationEmailController = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const targetEmail = req.body?.email ? req.body.email.trim().toLowerCase() : null;

        let user = null;
        if (userId) {
            user = await userData.findById(userId);
        } else if (targetEmail) {
            user = await userData.findOne({ email: targetEmail });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ success: false, message: "Email is already verified" });
        }

        const verificationToken = crypto.randomBytes(32).toString("hex");
        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);

        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = emailVerificationExpires;
        user.emailOtp = emailOtp;
        user.emailOtpExpires = emailVerificationExpires;
        await user.save();

        void sendVerificationEmail({
            to: user.email,
            name: user.name,
            verificationToken,
            otp: emailOtp,
        });

        return res.status(200).json({
            success: true,
            message: "Verification code sent to your email",
        });
    } catch (error) {
        console.error("sendVerificationEmailController error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to send verification email" });
    }
};

export const verifyEmailController = async (req, res) => {
    try {
        const token = req.body?.token || req.query?.token;
        const otp = req.body?.otp ? req.body.otp.toString().trim() : null;
        const email = req.body?.email ? req.body.email.trim().toLowerCase() : null;
        const userId = req.user?.id || req.user?._id;

        let user = null;

        if (token) {
            user = await userData.findOne({
                emailVerificationToken: token,
                emailVerificationExpires: { $gt: new Date() },
            });
        } else if (otp) {
            const query = {
                emailOtp: otp,
                emailOtpExpires: { $gt: new Date() },
            };
            if (userId) query._id = userId;
            else if (email) query.email = email;
            user = await userData.findOne(query);
        }

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification code / link",
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
        user.emailOtp = null;
        user.emailOtpExpires = null;
        await user.save();

        void sendWelcomeEmail({ to: user.email, name: user.name });

        return res.status(200).json({
            success: true,
            message: "Email verified successfully!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                isEmailVerified: true,
                avatar: user.avatar || "",
                about: user.about || "",
            },
        });
    } catch (error) {
        console.error("verifyEmailController error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to verify email" });
    }
};

export default { login, register, googleAuth, getMe, logout, sendVerificationEmailController, verifyEmailController };
