

const errorHandler = (err, req, res, next) => {
    const response = {
        message: err.message || "Something went wrong!",
        stack: process.env.NODE_ENV === "development" ? err.stack : {}
    };
    console.error(err.stack);
    res.status(500).json(response);
};

export default errorHandler;