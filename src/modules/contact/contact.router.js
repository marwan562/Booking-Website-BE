import { Router } from "express";
import { createContact, getAllContacts } from "./contact.controller.js";
import { allowedTo, auth } from "../../middlewares/auth.js";
import { uploadMixfile } from "../../middlewares/fileUpload.js";
import { saveImg } from "../../middlewares/uploadToCloud.js";
import { validation } from "../../middlewares/validation.js";
import { contactValidation } from "./contact.validation.js";

const contactRouter = Router();
contactRouter.post(
  "/",
  uploadMixfile([{ name: "attachedFiles", maxCount: 10 }]),
  saveImg,
  validation(contactValidation),
  createContact
);

contactRouter.get("/", auth, allowedTo("admin"), getAllContacts);

export default contactRouter;
