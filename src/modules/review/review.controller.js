import reviewModel from "../../models/reviewModel.js";
import subscriptionModel from "../../models/subscriptionModel.js";
import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { AppError } from "../../utilities/AppError.js";
import tourModel from "../../models/tourModel.js";
import leaveAReviewModel from "../../models/leave-a-reviewModel.js";
import { ApiFeature } from "../../utilities/AppFeature.js";

export const createReview = catchAsyncError(async (req, res, next) => {
  const { _id: userId, role } = req.user;
  const { id: tourId } = req.params;
  const { comment, rating, user: customUserId } = req.body;

  const tour = await tourModel.findById(tourId);

  if (!tour) {
    return next(new AppError("Tour not found", 404));
  }

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

  const isAdmin = role === "admin";

  if (!isAdmin) {
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

    req.body.user = userId;
  } else {
    // Admin logic: bypass checks
    if (customUserId) {
      req.body.user = customUserId;
    } else if (req.body.name) {
      // If a fake name is provided, ensure user is null so the fallback logic in model works
      req.body.user = null;
    } else {
      // Default to admin ID if no fake name or custom user ID is provided
      req.body.user = userId;
    }
  }

  req.body.tour = tourId;

  // Handle JSON parsing for images and avatar
  const parseSafe = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    if (Array.isArray(val)) {
      return val.map(item => (typeof item === 'string' ? parseSafe(item) : item));
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Handle object with numeric keys like { '0': '...', '1': '...' }
      const keys = Object.keys(val);
      if (keys.length > 0 && keys.every(k => !isNaN(k))) {
        return Object.values(val).map(item => (typeof item === 'string' ? parseSafe(item) : item));
      }
    }
    return val;
  };

  if (req.body.avatar) {
    req.body.avatar = parseSafe(req.body.avatar);
    if (typeof req.body.avatar === 'string' && req.body.avatar.startsWith('http')) {
      req.body.avatar = { url: req.body.avatar };
    }
  }
  if (req.body.images) req.body.images = parseSafe(req.body.images);

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
});

export const editReview = catchAsyncError(async (req, res, next) => {
  const { id: reviewId } = req.params;
  const { _id: userId, role } = req.user;

  // Handle JSON parsing for images and avatar
  const parseSafe = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    if (Array.isArray(val)) {
      return val.map(item => (typeof item === 'string' ? parseSafe(item) : item));
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Handle object with numeric keys like { '0': '...', '1': '...' }
      const keys = Object.keys(val);
      if (keys.length > 0 && keys.every(k => !isNaN(k))) {
        return Object.values(val).map(item => (typeof item === 'string' ? parseSafe(item) : item));
      }
    }
    return val;
  };

  if (req.body.avatar) {
    req.body.avatar = parseSafe(req.body.avatar);
    if (typeof req.body.avatar === 'string' && req.body.avatar.startsWith('http')) {
      req.body.avatar = { url: req.body.avatar };
    }
  }
  if (req.body.images) req.body.images = parseSafe(req.body.images);

  // Validate review ID
  if (!reviewId || reviewId.length !== 24) {
    return next(new AppError("Invalid review ID", 400));
  }

  const query = { _id: reviewId };
  if (role === "user") {
    query.user = userId;
  }

  // Admin refinements: 
  if (role === "admin") {
    if (req.body.name) {
      // If admin provides a name, they want it to be a fake review.
      // Explicitly set user to null to ensure the fallback logic in the model triggers.
      req.body.user = null;
    }
    // If req.body.user is provided, it will be handled by findOneAndUpdate.
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
    .sort({ createdAt: -1 });

  if (!reviews || reviews.length === 0) {
    return next(new AppError("No reviews found for this tour", 404));
  }

  for (let i = 0; i < reviews.length; i++) {
    if (!reviews[i].user) {
      reviews[i].user = {
        name: reviews[i].name,
        avatar: reviews[i].avatar,
        nationality: reviews[i].nationality,
      };
    }
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

  res.status(200).json({
    status: "success",
    data: {
      reviews,
      pagination: paginationMeta,
    },
  });
});
