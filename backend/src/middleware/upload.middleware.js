import multer from "multer";

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
]);

// 5 MB file size limit
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
        cb(null, true);
    } else {
        const error = new Error("Invalid file format. Only JPEG, PNG, WebP, and GIF images are allowed.");
        error.code = "INVALID_FILE_TYPE";
        cb(error, false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },
    fileFilter,
});

/**
 * Middleware for single avatar image upload
 * Accepts field names: 'avatar', 'image', or 'file'
 */
export const avatarUploadMiddleware = (req, res, next) => {
    const singleUpload = upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "image", maxCount: 1 },
        { name: "file", maxCount: 1 },
    ]);

    singleUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: "File size exceeds the 5MB limit. Please choose a smaller image.",
                });
            }
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`,
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || "Invalid file uploaded",
            });
        }

        // Normalize single file to req.file
        if (req.files) {
            req.file = req.files.avatar?.[0] || req.files.image?.[0] || req.files.file?.[0] || null;
        }

        next();
    });
};

export default avatarUploadMiddleware;
