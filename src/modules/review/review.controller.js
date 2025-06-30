import reviewModel from "../../../DataBase/models/reviewModel.js";
import subscriptionModel from "../../../DataBase/models/subscriptionModel.js";
import { catchAsyncError } from "../../../middlewares/catchAsyncError.js";
import { AppError } from "../../../utilities/AppError.js";

export const createReview = catchAsyncError(async (req, res, next) => {
  const { _id: userId } = req.user;
  const { id: tourId } = req.params;
  const currentDate = new Date();

  const subscription = await subscriptionModel.findOne({
    userDetails: userId,
    tourDetails: tourId,
    payment: "success",
  });

  if (!subscription) {
    return next(new AppError(`Can't add review. Subscription not found.`, 401));
  }

  // Extract the tour date from subscription and convert it to Date object
  const tourDateParts = subscription.date.split("/");
  const tourDate = new Date(
    `${tourDateParts[2]}-${tourDateParts[1]}-${tourDateParts[0]}`
  );

  // Check if the tour date is in the future
  if (tourDate > currentDate) {
    return next(
      new AppError(`Can't add review. Tour date has not passed yet.`, 401)
    );
  }
  req.body.tour = tourId;
  req.body.user = userId;
  const review = new reviewModel(req.body);

  await review.save();

  // Allow adding review
  res.status(200).send({ message: "success", data: review });
});

export const editReview = catchAsyncError(async (req, res, next) => {
  const { id: reviewId } = req.params;
  const { _id: userId } = req.user;

  const review = await reviewModel.findOneAndUpdate(
    { _id: reviewId, user: userId },
    req.body,
    {
      new: true,
    }
  );
  if (!review) {
    return next(new AppError("Can't find this review", 404));
  }
  res.status(200).send({ message: "success", data: review });
});

export const deleteReview = catchAsyncError(async (req, res, next) => {
  const { id: reviewId } = req.params;
  const { _id: userId } = req.user;
  const review = await reviewModel.findOneAndDelete({
    _id: reviewId,
    user: userId,
  });
  if (!review) {
    return next(new AppError("Can't find this review", 404));
  }
  res.status(200).send({ message: "review deleted" });
});

export const getAllReviews = catchAsyncError(async (req, res, next) => {
  const { id: tourId } = req.params;
  const reviews = await reviewModel.find({ tour: tourId });
  if (!reviews) {
    return next(new AppError("Reviews not found", 404));
  }
  res.status(200).send({ message: "success", data: reviews });
});
