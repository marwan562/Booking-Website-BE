import reviewModel from "../../models/reviewModel.js";
import subscriptionModel from "../../models/subscriptionModel.js";
import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { AppError } from "../../utilities/AppError.js";
import tourModel from "../../models/tourModel.js";
import leaveAReviewModel from "../../models/leave-a-reviewModel.js";
import { ApiFeature } from "../../utilities/AppFeature.js";

export const createReview = catchAsyncError(async (req, res, next) => {
  const { _id: userId } = req.user;
  const { id: tourId } = req.params;
  const { comment, rating } = req.body;

  const tour = await tourModel.findById(tourId);

  // Validate input
  if (!comment || !rating) {
    return next(new AppError("Comment and rating are required", 400));
  }

  if (comment.length > 7000) {
    return next(
      new AppError("Comment must be less than 7000 characters", 400)
    );
  }

  // Validate tour ID
  if (!tourId || tourId.length !== 24) {
    return next(new AppError("Invalid tour ID", 400));
  }

  const currentDate = new Date();
  const subscription = await subscriptionModel.findOne({
    userDetails: userId,
    bookingReference: tour.bookingReference,
    payment: "success",
  });

  if (!subscription) {
    return next(
      new AppError(
        "Cannot add review. You must have a paid subscription for this tour.",
        401
      )
    );
  }

  // Check if user has already reviewed this tour
  const existingReview = await reviewModel.findOne({
    user: userId,
    tour: tourId,
  });

  if (existingReview) {
    return next(new AppError("You have already reviewed this tour", 400));
  }

  // Extract the tour date from subscription and convert it to Date object
  const tourDateParts = subscription.date.split("-");
  const tourDate = new Date(
    `${tourDateParts[2]}-${tourDateParts[1]}-${tourDateParts[0]}`
  );

  // Check if the tour date is in the future
  if (tourDate > currentDate) {
    return next(
      new AppError("Cannot add review. Tour date has not passed yet.", 401)
    );
  }

  req.body.tour = tourId;
  req.body.user = userId;

  const review = new reviewModel(req.body);
  await review.save();

  res.status(201).json({
    status: "success",
    data: review,
  });
});

export const leaveAReview = catchAsyncError(async (req, res, next) => {
  const { name, email, comment, rating, images } = req.body;

  const review = new leaveAReviewModel({
    name,
    email,
    comment,
    rating,
    images,
  });

  await review.save();

  res.status(201).json({
    status: "success",
    data: review,
  });
})

export const editReview = catchAsyncError(async (req, res, next) => {
  const { id: reviewId } = req.params;
  const { _id: userId, role } = req.user;
  req.body.images = JSON.parse(req.body.images);

  // Validate review ID
  if (!reviewId || reviewId.length !== 24) {
    return next(new AppError("Invalid review ID", 400));
  }

  const query = {
    _id: reviewId,
  };

  if (role === "user") {
    query.user = userId;
  }

  const review = await reviewModel.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  });

  if (!review) {
    return next(
      new AppError("Review not found or you are not authorized to edit it", 404)
    );
  }

  res.status(200).json({
    status: "success",
    data: review,
  });
});

export const deleteReview = catchAsyncError(async (req, res, next) => {
  const { id: reviewId } = req.params;
  const { _id: userId, role } = req.user;

  // Validate review ID
  if (!reviewId || reviewId.length !== 24) {
    return next(new AppError("Invalid review ID", 400));
  }

  const query = {
    _id: reviewId,
  };

  if (role === "user") {
    query.user = userId;
  }

  const review = await reviewModel.findOneAndDelete(query);

  if (!review) {
    return next(
      new AppError(
        "Review not found or you are not authorized to delete it",
        404
      )
    );
  }

  res.status(200).json({
    status: "success",
    message: "Review deleted successfully",
  });
});

export const getAllReviews = catchAsyncError(async (req, res, next) => {
  const { id: tourId } = req.params;

  // Validate tour ID
  if (!tourId || tourId.length !== 24) {
    return next(new AppError("Invalid tour ID", 400));
  }

  const reviews = await reviewModel
    .find({ tour: tourId })
    .sort({ createdAt: -1 })
    .lean();

  if (!reviews || reviews.length === 0) {
    return next(new AppError("No reviews found for this tour", 404));
  }

  res.status(200).json({
    status: "success",
    data: reviews,
    count: reviews.length,
  });
});

export const getAllLeaveReviews = catchAsyncError(async (req, res, next) => {
  const apiFeature = new ApiFeature(leaveAReviewModel.find(), req.query)
    .paginate()
    .fields()
    .filter()
    .search()
    .sort()
    .lean();

  const reviews = await apiFeature.mongoseQuery;
  const totalCount = await leaveAReviewModel.countDocuments(
    apiFeature.mongoseQuery._conditions
  );
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  if (!reviews || reviews.length === 0) {
    return next(new AppError("No reviews found", 404));
  }
  console.log(reviews)
  res.status(200).json({
    status: "success",
    data: {
      reviews,
      pagination: paginationMeta,
    },
  });
});
