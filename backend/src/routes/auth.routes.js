import express from "express";
import { register, login, getMe, logout } from "../controller/auth.controller.js";
import { signInValidator, signUpValidator } from "../validator/auth.validator.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signUpValidator, register);
router.post("/signin", signInValidator, login);
router.get("/me", authMiddleware, getMe);
router.post("/logout", logout);

export default router;