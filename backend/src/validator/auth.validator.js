import { body ,validationResult} from "express-validator";

const validator = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const signInValidator = [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("userName").withMessage("userName is required"),
    body("password").notEmpty().isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    validator
];

const signUpValidator = [
    body("email").notEmpty().isEmail().withMessage("Please provide a valid email"),
    body("userName").notEmpty().withMessage("userName is required"),
    body("name").notEmpty().withMessage("Name is required"),
    body("password").notEmpty().isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    validator
];


export default { signInValidator, signUpValidator };