import express from "express";
import { register, login } from "../controller/auth.controller.js";
import {signInValidator, signUpValidator} from "../validator/auth.validator.js";
const router = express.Router();

router.post("/signup", signUpValidator, register);
router.post("/signin", signInValidator, login);


export default router;