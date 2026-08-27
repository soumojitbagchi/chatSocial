import { body, oneOf, validationResult } from "express-validator";

const validator = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorArray = errors.array();
        const primaryMessage = errorArray[0]?.msg || "Validation failed";
        return res.status(400).json({
            message: primaryMessage,
            errors: errorArray,
            success: false,
        });
    }
    next();
};

export const signInValidator = [
    oneOf([
        body("email").isEmail().withMessage("Please provide a valid email address"),
        body("username").isString().notEmpty().withMessage("Username is required")
    ], { message: "Please provide either a valid email address or username" }),
    body("password").notEmpty().withMessage("Password is required").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    validator
];

export const signUpValidator = [
    body("name").notEmpty().trim().withMessage("Name is required"),
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Please provide a valid email address"),
    body("username").notEmpty().trim().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    validator
];

export default { signInValidator, signUpValidator };
