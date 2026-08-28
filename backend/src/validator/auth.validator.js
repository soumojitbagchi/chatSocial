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
        body("identifier").isString().trim().notEmpty().withMessage("Please provide an email or username"),
        body("email").isString().trim().notEmpty().withMessage("Please provide an email or username"),
        body("username").isString().trim().notEmpty().withMessage("Please provide an email or username")
    ], { message: "Please provide either an email or username" }),
    body("password").notEmpty().withMessage("Password is required"),
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
