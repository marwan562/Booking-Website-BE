import cloudinary from "cloudinary";
import { AppError } from "../utilities/AppError.js";
import convertToWebp from "../utilities/convertToWebp.js";

// Validate cloudinary configuration
if (
  !process.env.CLOUDINARY_NAME ||
  !process.env.API_KEY_CLOUDINARY ||
  !process.env.API_SECRET_CLOUDINARY
) {
  throw new Error(
    "Cloudinary configuration is missing. Please check your environment variables."
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.API_KEY_CLOUDINARY,
  api_secret: process.env.API_SECRET_CLOUDINARY,
})
console.log("Cloudinary has been successfully connected.")

export const saveImg = async (req, res, next) => {
  function uploadToCloudinary(buffer, folderName) {
    return new Promise((resolve, reject) => {
      cloudinary.v2.uploader
        .upload_stream(
          {
            folder: folderName,
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
            transformation: [{ quality: "auto:good" }],
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(
                new AppError(
                  `Error uploading to Cloudinary: ${error.message}`,
                  500
                )
              );
            } else {
              resolve({ url: result.url, public_id: result.public_id });
            }
          }
        )
        .end(buffer);
    });
  }

  function getFolderName() {
    let folderNameParts = req.baseUrl.split("");
    folderNameParts.shift();
    folderNameParts.push("s");
    return folderNameParts.join("");
  }

  async function uploadSingleFile(fieldName, buffer) {
    try {
      return await handleFileUpload(fieldName, buffer);
    } catch (error) {
      throw new AppError(
        `Failed to upload ${fieldName}: ${error.message}`,
        500
      );
    }
  }

  async function uploadMultipleFiles(fieldName, files) {
    const uploadedFiles = [];
    for (const file of files) {
      const result = await handleFileUpload(fieldName, file.buffer);
      uploadedFiles.push(result);
    }
    return uploadedFiles;
  }

  async function handleFileUpload(fieldName, buffer) {
    try {
      const folder = getFolderName();
      const convertedBuffer = await convertToWebp(buffer);
      return await uploadToCloudinary(convertedBuffer, folder);
    } catch (error) {
      throw new AppError(`File upload failed: ${error.message}`, 500);
    }
  }

  if (req.files) {
    for (const fieldName in req.files) {
      const files = req.files[fieldName];
      if (files.length === 1) {
        req.body[fieldName] = await uploadSingleFile(
          fieldName,
          files[0].buffer
        );
      } else {
        req.body[fieldName] = await uploadMultipleFiles(fieldName, files);
      }
    }
  } else {
    req.body[req.file?.fieldname] = await handleFileUpload(
      getFolderName(),
      req.file?.buffer
    );
  }

  next();
};
