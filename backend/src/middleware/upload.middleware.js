import multer from "multer";

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
]);

const ALLOWED_STORY_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska",
]);

// 10 MB file size limit for avatars
const MAX_AVATAR_SIZE = 10 * 1024 * 1024;
// 25 MB file size limit for story media (images and videos)
const MAX_STORY_SIZE = 25 * 1024 * 1024;

const avatarFileFilter = (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype.toLowerCase())) {
        cb(null, true);
    } else {
        const error = new Error("Invalid file format. Only JPEG, PNG, WebP, and GIF images are allowed.");
        error.code = "INVALID_FILE_TYPE";
        cb(error, false);
    }
};

const storyFileFilter = (req, file, cb) => {
    if (ALLOWED_STORY_MIME_TYPES.has(file.mimetype.toLowerCase())) {
        cb(null, true);
    } else {
        const error = new Error("Invalid file format for status. Allowed formats: JPEG, PNG, WebP, GIF, MP4, WebM, MOV.");
        error.code = "INVALID_FILE_TYPE";
        cb(error, false);
    }
};

const avatarUpload = multer({
    storage,
    limits: {
        fileSize: MAX_AVATAR_SIZE,
        files: 1,
    },
    fileFilter: avatarFileFilter,
});

const storyUpload = multer({
    storage,
    limits: {
        fileSize: MAX_STORY_SIZE,
        files: 1,
    },
    fileFilter: storyFileFilter,
});

/**
 * Middleware for single avatar image upload
 * Accepts field names: 'avatar', 'image', or 'file'
 */
export const avatarUploadMiddleware = (req, res, next) => {
    const singleUpload = avatarUpload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "image", maxCount: 1 },
        { name: "file", maxCount: 1 },
    ]);

    singleUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: "File size exceeds the 10MB limit. Please choose a smaller image.",
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

        if (req.files) {
            req.file = req.files.avatar?.[0] || req.files.image?.[0] || req.files.file?.[0] || null;
        }

        next();
    });
};

/**
 * Middleware for status story upload (image, video, or file)
 * Accepts field names: 'media', 'file', 'image', 'video', 'story'
 */
export const storyUploadMiddleware = (req, res, next) => {
    const singleUpload = storyUpload.fields([
        { name: "media", maxCount: 1 },
        { name: "file", maxCount: 1 },
        { name: "image", maxCount: 1 },
        { name: "video", maxCount: 1 },
        { name: "story", maxCount: 1 },
    ]);

    singleUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: "File size exceeds the 25MB limit for status updates.",
                });
            }
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`,
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || "Invalid file format uploaded",
            });
        }

        if (req.files) {
            req.file = req.files.media?.[0] || req.files.file?.[0] || req.files.image?.[0] || req.files.video?.[0] || req.files.story?.[0] || null;
        }

        next();
    });
};

export default {
    avatarUploadMiddleware,
    storyUploadMiddleware,
};
