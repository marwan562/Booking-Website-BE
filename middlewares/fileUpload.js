import multer from "multer";
import { AppError } from "../utilities/AppError.js";

const option = () => {
  const inMemoryStorage = multer.memoryStorage();

  function fileFilter(req, file, cb) {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new AppError("image only", 400), false);
    }
  }

  return multer({ storage: inMemoryStorage, fileFilter });
};

export const uploadSingleFile = (fieldName, folderName) => {
  return option(folderName).single(fieldName);
};

export const uploadMixfile = (arrayOfFields, folderName) =>{
  return  option(folderName).fields(arrayOfFields);
}
 