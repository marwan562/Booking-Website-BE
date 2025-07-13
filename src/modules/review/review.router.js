import { Router } from "express";

import {
  createReview,
  deleteReview,
  editReview,
  getAllReviews,
} from "./review.controller.js";
import {
  ReviewSchmea,
  createReviewSchema,
  editReviewSchmea,
} from "./review.validation.js";
import { validation } from "../../middlewares/validation.js";
import { auth } from "../../middlewares/auth.js";
const reviewRouter = Router();

reviewRouter
  .route("/:id")
  .post(auth, validation(createReviewSchema), createReview)
  .patch(auth, validation(editReviewSchmea), editReview)
  .delete(auth, validation(ReviewSchmea), deleteReview)
  .get(validation(ReviewSchmea), getAllReviews);

export default reviewRouter;
