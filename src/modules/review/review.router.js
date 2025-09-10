import { Router } from "express";

import {
  createReview,
  deleteReview,
  editReview,
  getAllReviews,
} from "./review.controller.js";
import {
  reviewSchema,
  createReviewSchema,
  editReviewSchema,
} from "./review.validation.js";
import { validation } from "../../middlewares/validation.js";
import { auth } from "../../middlewares/auth.js";
import { saveImg } from "../../middlewares/uploadToCloud.js";
import { uploadMixfile } from "../../middlewares/fileUpload.js";
const reviewRouter = Router();

reviewRouter
  .route("/:id")
  .post(
    auth,
    uploadMixfile([{ name: "images", maxCount: 10 }]),
    saveImg,
    validation(createReviewSchema),
    createReview
  )
  .patch(auth, validation(editReviewSchema), editReview)
  .delete(auth, validation(reviewSchema), deleteReview)
  .get(validation(reviewSchema), getAllReviews);

export default reviewRouter;
