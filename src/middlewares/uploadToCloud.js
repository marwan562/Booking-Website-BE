import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../utilities/AppError.js";
import convertToWebp from "../utilities/convertToWebp.js";
import { Readable } from "stream";
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

const uploadToCloudinaryForPassport = (fileBuffer, folder = "passports") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    const readable = new Readable();
    readable._read = () => {};
    readable.push(fileBuffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

export const saveImgPassport = async (req, res, next) => {
  try {
    const passengers = req.body.passengers;

    if (!Array.isArray(passengers)) {
      return next();
    }

    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i];
      const passportFile = passenger.passport;

      if (
        passportFile &&
        typeof passportFile === "object" &&
        passportFile.buffer
      ) {
        const uploadResult = await uploadToCloudinaryForPassport(
          passportFile.buffer,
          "passports"
        );

        passenger.passport = {
          url: uploadResult.url,
          public_id: uploadResult.public_id,
        };
      }
    }

    next();
  } catch (error) {
    console.error("Passport upload error:", error);
    return res.status(500).json({ message: "Error uploading passport image" });
  }
};

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
export const saveImg = async (req, res, next) => {
  function getFolderName() {
    let folderNameParts = req.baseUrl.split("/");
    folderNameParts.shift();
    folderNameParts.push("s");
    return folderNameParts.join("");
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

  try {
    if (req.files && Object.keys(req.files).length > 0) {
      for (const fieldName in req.files) {
        const files = req.files[fieldName];

        const uploaded = await uploadMultipleFiles(fieldName, files);
        if (
          fieldName === "mainImg" ||
          fieldName === "avatar" ||
          fieldName === "passport" ||
          fieldName === "image"
        ) {
          req.body[fieldName] = uploaded[0];
        } else {
          req.body[fieldName] = uploaded;
        }
      }
    } else if (req.file && req.file.buffer) {
      req.body[req.file.fieldname] = await handleFileUpload(req.file.fieldname, req.file.buffer);
    }
    next();
  } catch (error) {
    console.error("Error in saveImg middleware:", error);
    next(error);
  }
};