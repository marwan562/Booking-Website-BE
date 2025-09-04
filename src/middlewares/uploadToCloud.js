import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../utilities/AppError.js";
import convertToWebp from "../utilities/convertToWebp.js";
import "dotenv/config";

let cloud_name = process.env.CLOUDINARY_NAME,
  api_key = process.env.API_KEY_CLOUDINARY,
  api_secret = process.env.API_SECRET_CLOUDINARY;

if (cloud_name && api_key && api_secret) {
  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
  });
  console.log("Cloudinary has been successfully connected.");
} else {
  console.warn(
    "Cloudinary configuration is missing. File uploads will be disabled."
  );
  process.exit(1);
}

export const saveImg = async (req, res, next) => {
  function uploadToCloudinary(buffer, folderName) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: folderName,
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
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
    const uploadedFiles = await Promise.all(
      files.map((file) => handleFileUpload(fieldName, file.buffer))
    );
    return uploadedFiles;
  }

  async function handleFileUpload(fieldName, buffer) {
    try {
      const folder = getFolderName();
      const webpBuffer = await convertToWebp(buffer);
      return uploadToCloudinary(webpBuffer, folder);
    } catch (error) {
      throw new AppError(
        `Error uploading field "${fieldName}" to Cloudinary: ${error.message}`,
        500
      );
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
    if (req.file && req.file.buffer) {
      req.body[req.file.fieldname] = await handleFileUpload(
        req.file.fieldname,
        req.file.buffer
      );
    }
  }

  next();
};
