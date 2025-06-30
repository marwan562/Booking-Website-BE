import { Router } from "express";
import {
  createTestimonial,
  deleteTestimonial,
  editTestimonial,
  getAllTestimonial
} from "./testimonial.controller.js";

import {
  testimonialSchema,
  testimonialUpdateSchema
} from "./testimonial.validation.js";
import { saveImg } from "../../../middlewares/uploadToCloud.js";
import { validation } from "../../../middlewares/validation.js";
import { uploadSingleFile } from "../../../middlewares/fileUpload.js";

const testimonialRouter = Router();

testimonialRouter
  .route("/")
  .get(getAllTestimonial)
  .post(
    uploadSingleFile("avatar"),
    saveImg,
    validation(testimonialSchema),
    createTestimonial
  );

testimonialRouter
  .route("/:id")
  .delete(deleteTestimonial)
  .patch(
    uploadSingleFile("avatar"),
    saveImg,
    validation(testimonialUpdateSchema),
    editTestimonial
  );

export default testimonialRouter;
