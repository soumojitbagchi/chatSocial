import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookies from "cookie-parser";


export const login = async (req, res) => {
    const { email, password ,username} = req.body;
    const isUserExists = await userData.findOne({$or: [{ email }, { username }]});
    if (!isUserExists) {
        return res.status(404).json({ message: "User not found" ,success: false});
    }
    const isPasswordValid = await bcrypt.compare(password, isUserExists.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid password" ,success: false});
    }
    const token = jwt.sign({ id: isUserExists._id ,email: isUserExists.email}, process.env.JWT_SECRET, { expiresIn: "4*6h" });
    res.cookie("token", token);
    res.status(201).json({ message: "Login successful" ,success: true});
};

export const register = async (req, res) => {
    const { email, password ,username , name} = req.body;
    const isUserExists = await userData.findOne({$or: [{ email }, { username }]});
    if (isUserExists) {
        return res.status(409).json({ message: "User already exists" ,success: false});
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userData.create({ email, password: hashedPassword, username, name });
    const token = jwt.sign({ id: user._id ,email: user.email}, process.env.JWT_SECRET, { expiresIn: "4*6h" });
    res.status(201).json({ message: "User created successfully" ,success: true});
};
