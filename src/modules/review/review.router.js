import { Router } from "express";

import {
  createReview,
  deleteReview,
  editReview,
  getAllLeaveReviews,
  getAllReviews,
  leaveAReview,
} from "./review.controller.js";
import {
  reviewSchema,
  createReviewSchema,
  createLeaveAReviewSchema,
} from "./review.validation.js";
import { validation } from "../../middlewares/validation.js";
import { auth, allowedTo } from "../../middlewares/auth.js";
import { saveImg } from "../../middlewares/uploadToCloud.js";
import { uploadMixfile } from "../../middlewares/fileUpload.js";
const reviewRouter = Router();

reviewRouter.post("/leave-a-review", uploadMixfile([{ name: "images", maxCount: 10 }]), saveImg, validation(createLeaveAReviewSchema), leaveAReview)

reviewRouter.get("/leave-a-review", auth, allowedTo("admin"), getAllLeaveReviews);

reviewRouter
  .route("/:id")
  .post(
    auth,
    uploadMixfile([{ name: "images", maxCount: 10 }]),
    saveImg,
    validation(createReviewSchema),
    createReview
  )
  .patch(
    auth,
    uploadMixfile([{ name: "images", maxCount: 10 }]),
    saveImg,
    editReview
  )
  .delete(auth, validation(reviewSchema), deleteReview)
  .get(validation(reviewSchema), getAllReviews);

export default reviewRouter;
