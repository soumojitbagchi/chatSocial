const errorHandler = (err, req, res, next) => {
    if (err?.code === "REDIS_UNAVAILABLE") {
        return res.status(503).json({
            success: false,
            message: "User data cache is temporarily unavailable",
        });
    }

    const response = {
        message: err.message || "Something went wrong!",
        stack: process.env.NODE_ENV === "development" ? err.stack : {}
    };
    console.error(err.stack);
    return res.status(500).json(response);
};

export default errorHandler;
