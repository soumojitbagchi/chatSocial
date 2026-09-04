import ImageKit from "@imagekit/nodejs";

let imagekitInstance = null;

export const getImageKitClient = () => {
    if (imagekitInstance) return imagekitInstance;

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || "";
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "";

    if (!privateKey) {
        throw new Error("ImageKit is not configured. Please check IMAGEKIT_PRIVATE_KEY in environment variables.");
    }

    try {
        imagekitInstance = new ImageKit({
            privateKey,
            ...(publicKey ? { publicKey } : {}),
            ...(urlEndpoint ? { urlEndpoint } : {}),
        });
        return imagekitInstance;
    } catch (err) {
        console.error("[ImageKit] Initialization error:", err);
        throw new Error(`Failed to initialize ImageKit: ${err.message}`);
    }
};

/**
 * Upload an image buffer to ImageKit
 * @param {Object} options
 * @param {Buffer} options.fileBuffer - Raw file buffer from multer
 * @param {string} options.fileName - Destination file name
 * @param {string} [options.folder="/chatSocial/avatars"] - Destination folder in ImageKit
 * @param {string[]} [options.tags=[]] - Tags for asset management
 * @returns {Promise<{ url: string, fileId?: string, name?: string }>}
 */
export const uploadImage = async ({ fileBuffer, fileName, folder = "/chatSocial/avatars", tags = [] }) => {
    if (!fileBuffer) {
        throw new Error("File buffer is required for upload");
    }
    const imagekit = getImageKitClient();

    const cleanFileName = fileName || `image_${Date.now()}.png`;

    try {
        const base64File = fileBuffer.toString("base64");

        const uploadPromise = imagekit.files.upload({
            file: base64File,
            fileName: cleanFileName,
            folder: folder.startsWith("/") ? folder : `/${folder}`,
            tags: Array.isArray(tags) ? tags : [String(tags)],
            useUniqueFileName: true,
            isPrivateFile: false,
        });

        const response = await Promise.race([
            uploadPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("ImageKit upload timeout")), 8000))
        ]);

        if (!response || !response.url) {
            throw new Error("ImageKit upload succeeded but returned no asset URL");
        }

        return {
            url: response.url,
            fileId: response.fileId || null,
            name: response.name || cleanFileName,
            thumbnailUrl: response.thumbnailUrl || response.url,
            height: response.height || null,
            width: response.width || null,
            size: response.size || null,
        };
    } catch (error) {
  
        console.error("[ImageKit] Upload failed:", error.message);
        throw error instanceof Error ? error : new Error("ImageKit upload failed");
    }
};

/**
 * Delete an image from ImageKit by fileId
 * @param {string} fileId
 */
export const deleteImage = async (fileId) => {
    if (!fileId) return;
    try {
        const imagekit = getImageKitClient();
        if (imagekit.files && typeof imagekit.files.delete === "function") {
            await imagekit.files.delete(fileId);
        }
    } catch (err) {
        console.warn("[ImageKit] Delete error:", err.message);
    }
};

export default {
    uploadImage,
    deleteImage,
};
