import multer from "multer";
import { AppError } from "../utilities/AppError.js";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const option = () => {
  const inMemoryStorage = multer.memoryStorage();

  function fileFilter(req, file, cb) {
    // Check file mimetype
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new AppError("Only image files (JPEG, PNG, WebP, GIF) are allowed", 400), false);
    }
    
    // Check file size (5MB limit)
    if (file.size && file.size > MAX_SIZE) {
      return cb(new AppError("File size too large. Maximum size is 5MB", 400), false);
    }
    
    // Additional security checks
    if (!file.originalname || file.originalname.length > 255) {
      return cb(new AppError("Invalid filename", 400), false);
    }
    
    // Check for potentially malicious file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (dangerousExtensions.includes(fileExtension)) {
      return cb(new AppError("File type not allowed for security reasons", 400), false);
    }
    
    cb(null, true);
  }

  return multer({ 
    storage: inMemoryStorage, 
    fileFilter,
    limits: {
      fileSize: MAX_SIZE, // 5MB
      files: 5, // Maximum 5 files
      fieldSize: 2 * 1024 * 1024 // 2MB field size
    }
  });
};

export const uploadSingleFile = (fieldName, folderName) => {
  return option(folderName).single(fieldName);
};

export const uploadMixfile = (arrayOfFields, folderName) =>{
  return option(folderName).fields(arrayOfFields);
}
 