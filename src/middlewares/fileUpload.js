import multer from "multer";
import { AppError } from "../utilities/AppError.js";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/jpg",
];
const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".pif",
  ".scr",
  ".vbs",
  ".js",
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const { mimetype, originalname } = file;

  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    return cb(
      new AppError("Only image files (JPEG, PNG, WebP, GIF) are allowed", 400)
    );
  }

  if (!originalname || originalname.length > 255) {
    return cb(new AppError("Invalid filename", 400));
  }

  const extension = originalname
    .toLowerCase()
    .slice(originalname.lastIndexOf("."));
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return cb(new AppError("File type not allowed for security reasons", 400));
  }

  cb(null, true);
};

const getMulterInstance = () =>
  multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_SIZE,
      files: 10,
      fieldSize: 2 * 1024 * 1024,
    },
  });

export const uploadSingleFile = (fieldName) =>
  getMulterInstance().single(fieldName);

export const uploadMixfile = (arrayOfFields) =>
  getMulterInstance().fields(arrayOfFields);
