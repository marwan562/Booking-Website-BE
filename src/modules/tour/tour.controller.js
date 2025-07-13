import tourModel from "../../models/tourModel.js";
import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { removeImage } from "../../middlewares/deleteImg.js";
import { AppError } from "../../utilities/AppError.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import { ObjectId } from "mongodb";

const createTour = catchAsyncError(async (req, res, next) => {
  // Validate required fields
  const { title, description, category, location } = req.body;

  if (!title || !description || !category || !location) {
    return next(
      new AppError(
        "Missing required fields: title, description, category, location",
        400
      )
    );
  }

  // Validate location object
  if (!location.from || !location.to) {
    return next(
      new AppError("Location must include 'from' and 'to' fields", 400)
    );
  }

  // Validate pricing
  if (
    !req.body.adultPricing ||
    !Array.isArray(req.body.adultPricing) ||
    req.body.adultPricing.length === 0
  ) {
    return next(
      new AppError("At least one adult pricing option is required", 400)
    );
  }

  const tour = await tourModel.create(req.body);

  if (!tour) {
    return next(new AppError("Failed to create tour", 500));
  }

  res.status(201).json({
    status: "success",
    data: tour,
  });
});

const deleteTour = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  // Validate tour ID
  if (!id || id.length !== 24) {
    return next(new AppError("Invalid tour ID", 400));
  }

  const tour = await tourModel.findByIdAndDelete(id);

  if (!tour) {
    return next(new AppError("Tour not found", 404));
  }

  // Clean up images
  try {
    if (tour.mainImg && tour.mainImg.public_id) {
      removeImage(tour.mainImg.public_id);
    }

    if (tour.images && Array.isArray(tour.images)) {
      tour.images.forEach((img) => {
        if (img && img.public_id) {
          removeImage(img.public_id);
        }
      });
    }
  } catch (error) {
    console.error("Error cleaning up images:", error);
  }

  res.status(200).json({
    status: "success",
    message: "Tour deleted successfully",
  });
});

const updateTour = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  // Validate tour ID
  if (!id || id.length !== 24) {
    return next(new AppError("Invalid tour ID", 400));
  }

  const tour = await tourModel.findById(id);

  if (!tour) {
    return next(new AppError("Tour not found", 404));
  }

  // Clean up old images if new ones are provided
  try {
    if (req.body.mainImg && tour.mainImg && tour.mainImg.public_id) {
      removeImage(tour.mainImg.public_id);
    }

    if (req.body.images && tour.images && Array.isArray(tour.images)) {
      tour.images.forEach((img) => {
        if (img && img.public_id) {
          removeImage(img.public_id);
        }
      });
    }
  } catch (error) {
    console.error("Error cleaning up old images:", error);
  }

  const updatedTour = await tourModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedTour) {
    return next(new AppError("Failed to update tour", 500));
  }

  res.status(200).json({
    status: "success",
    data: updatedTour,
  });
});

const getAllTour = catchAsyncError(async (req, res, next) => {
  const apiFeature = new ApiFeature(tourModel.find(), req.query)
    .paginate()
    .fields()
    .filter()
    .search()
    .sort();

  const result = await apiFeature.mongoseQuery.lean();
  const countTours = await tourModel.find().countDocuments();
  const pageNumber = Math.ceil(countTours / 10);

  if (!result) {
    return next(new AppError("No tours found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      page: apiFeature.page,
      result,
      pageNumber,
      total: countTours,
    },
  });
});

const getTourById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  // Validate tour ID
  if (!id || id.length !== 24) {
    return next(new AppError("Invalid tour ID", 400));
  }

  const tour = await tourModel.findById(id);

  if (!tour) {
    return next(new AppError("Tour not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: tour,
  });
});

const deleteAllTour = catchAsyncError(async (req, res, next) => {
  // This is a dangerous operation - should be restricted to admin only
  // Consider adding confirmation or additional security measures

  const result = await tourModel.deleteMany();

  res.status(200).json({
    status: "success",
    message: `${result.deletedCount} tours deleted successfully`,
  });
});

const orderTour = catchAsyncError(async (req, res, next) => {
  // Validate input
  if (!req.body || !Array.isArray(req.body) || req.body.length === 0) {
    return next(
      new AppError("Invalid input: expected array of tour objects", 400)
    );
  }

  // Validate each tour object
  for (const item of req.body) {
    if (!item._id || !item.index) {
      return next(
        new AppError("Each tour object must have _id and index", 400)
      );
    }

    // Validate ObjectId
    if (!ObjectId.isValid(item._id)) {
      return next(new AppError(`Invalid tour ID: ${item._id}`, 400));
    }

    // Validate index
    if (typeof item.index !== "number" || item.index < 0) {
      return next(new AppError(`Invalid index for tour ${item._id}`, 400));
    }
  }

  // Update tours in batch
  const updatePromises = req.body.map((item) => {
    const objectId = new ObjectId(item._id);
    return tourModel.updateOne(
      { _id: objectId },
      { $set: { index: item.index } }
    );
  });

  await Promise.all(updatePromises);

  res.status(200).json({
    status: "success",
    message: "Tour order updated successfully",
  });
});

export {
  orderTour,
  getAllTour,
  createTour,
  getTourById,
  deleteTour,
  updateTour,
  deleteAllTour,
};
