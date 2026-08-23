import { body, oneOf, validationResult } from "express-validator";

const validator = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const signInValidator = [
    oneOf([
        body("email").isEmail().withMessage("Please provide a valid email"),
        body("username").isString().notEmpty().withMessage("Username is required")
    ], { message: "Provide either a valid email or username" }),
    body("password").notEmpty().isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    validator
];

export const signUpValidator = [
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Please provide a valid email"),
    body("username").notEmpty().isString().withMessage("Username is required"),
    body("name").notEmpty().isString().withMessage("Name is required"),
    body("password").notEmpty().isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    validator
];