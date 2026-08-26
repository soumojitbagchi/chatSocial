import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = req.cookies?.token || bearerToken || null;

    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
    }
};

export default authMiddleware;