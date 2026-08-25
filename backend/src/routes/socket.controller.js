import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
    res.send("Socket controller");
});

export default router;