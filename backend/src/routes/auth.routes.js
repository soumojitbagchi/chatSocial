import express from "express";
import { register, login, googleAuth, getMe, logout, sendVerificationEmailController, verifyEmailController } from "../controller/auth.controller.js";
import { signInValidator, signUpValidator } from "../validator/auth.validator.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signUpValidator, register);
router.post("/register", signUpValidator, register);
router.post("/signin", signInValidator, login);
router.post("/login", signInValidator, login);
router.post("/google", googleAuth);
router.get("/me", authMiddleware, getMe);
router.post("/logout", logout);
router.post("/send-verification", sendVerificationEmailController);
router.post("/verify-email", verifyEmailController);
router.get("/verify-email", verifyEmailController);

export default router;