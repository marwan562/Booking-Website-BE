import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { removeImage } from "../../middlewares/deleteImg.js";
import { AppError } from "../../utilities/AppError.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import { ObjectId } from "mongodb";
import destinationModel from "../../models/destinationModel.js";
import tourModel from "../../models/tourModel.js";
import { updatePopularDestinations } from "../../../utilities/updatePopularDestinations.js";
import { scheduleJob } from "node-schedule";

const createDestination = catchAsyncError(async (req, res, next) => {
  const { city, country } = req.body;

  if (!country) {
    return next(new AppError("Missing required fields: country", 400));
  }

  const existingDestination = await destinationModel.findOne({
    city: city && { $regex: city, $options: "i" },
    country: { $regex: country, $options: "i" },
  });

  if (existingDestination) {
    return next(new AppError("Destination already exists", 409));
  }

  const destination = await destinationModel.create(req.body);

  if (!destination) {
    return next(new AppError("Failed to create destination", 500));
  }

  res.status(201).json({
    status: "success",
    data: destination,
  });
});

const deleteDestination = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  if (!id || id.length !== 24) {
    return next(new AppError("Invalid destination ID", 400));
  }

  const destination = await destinationModel.findById(id);

  if (!destination) {
    return next(new AppError("Destination not found", 404));
  }

  const toursCount = await tourModel.countDocuments({ destination: id });

  if (toursCount > 0) {
    return next(
      new AppError(
        `Cannot delete destination with ${toursCount} associated tours. Please delete tours first.`,
        400
      )
    );
  }

  try {
    if (destination.mainImg && destination.mainImg.public_id) {
      removeImage(destination.mainImg.public_id);
    }

    if (destination.images && Array.isArray(destination.images)) {
      destination.images.forEach((img) => {
        if (img && img.public_id) {
          removeImage(img.public_id);
        }
      });
    }
  } catch (error) {
    console.error("Error cleaning up images:", error);
  }

  await destinationModel.findByIdAndDelete(id);

  res.status(200).json({
    status: "success",
    message: "Destination deleted successfully",
  });
});

const updateDestination = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  if (!id || id.length !== 24) {
    return next(new AppError("Invalid destination ID", 400));
  }

  const destination = await destinationModel.findById(id);

  if (!destination) {
    return next(new AppError("Destination not found", 404));
  }

  try {
    if (
      req.body.mainImg &&
      destination.mainImg &&
      destination.mainImg.public_id
    ) {
      removeImage(destination.mainImg.public_id);
    }

    if (
      req.body.images &&
      destination.images &&
      Array.isArray(destination.images)
    ) {
      destination.images.forEach((img) => {
        if (img && img.public_id) {
          removeImage(img.public_id);
        }
      });
    }
  } catch (error) {
    console.error("Error cleaning up old images:", error);
  }

  const updatedDestination = await destinationModel.findByIdAndUpdate(
    id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedDestination) {
    return next(new AppError("Failed to update destination", 500));
  }

  res.status(200).json({
    status: "success",
    data: updatedDestination,
  });
});

const getAllDestinations = catchAsyncError(async (req, res, next) => {
  const apiFeature = new ApiFeature(destinationModel.find(), req.query)
    .paginate()
    .fields()
    .filter()
    .search()
    .sort()
    .lean();

  const result = await apiFeature.mongoseQuery;

  const totalCount = await apiFeature.getTotalCount();
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  if (!result || result.length === 0) {
    return next(new AppError("No destinations found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      destinations: result,
      pagination: paginationMeta,
    },
  });
});

const getDestinationById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  if (!id || id.length !== 24) {
    return next(new AppError("Invalid destination ID", 400));
  }

  const destination = await destinationModel.findById(id).lean();

  if (!destination) {
    return next(new AppError("Destination not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: destination,
  });
});

const deleteAllDestinations = catchAsyncError(async (req, res, next) => {
  const destinationsWithTours = await tourModel.distinct("destination");

  if (destinationsWithTours.length > 0) {
    return next(
      new AppError(
        "Cannot delete destinations that have associated tours. Please delete tours first.",
        400
      )
    );
  }

  const result = await destinationModel.deleteMany();

  res.status(200).json({
    status: "success",
    message: `${result.deletedCount} destinations deleted successfully`,
  });
});

const getPopularDestinations = catchAsyncError(async (req, res, next) => {
  const { limit = 10, page = 1 } = req.query;

  const apiFeature = new ApiFeature(destinationModel.find({ popular: true }), {
    limit,
    page,
  })
    .paginate()
    .sort({ averageRating: -1, totalReviews: -1, totalTours: -1 })
    .lean();

  const result = await apiFeature.mongoseQuery;
  const totalCount = await destinationModel.countDocuments({ popular: true });
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  res.status(200).json({
    status: "success",
    data: {
      destinations: result,
      pagination: paginationMeta,
    },
  });
});

const getDestinationStats = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  if (!id || id.length !== 24) {
    return next(new AppError("Invalid destination ID", 400));
  }

  const destination = await destinationModel.findById(id);

  if (!destination) {
    return next(new AppError("Destination not found", 404));
  }

  const tourStats = await tourModel.aggregate([
    { $match: { destination: new ObjectId(id) } },
    {
      $group: {
        _id: null,
        totalTours: { $sum: 1 },
        totalTravelers: { $sum: "$totalTravelers" },
        averagePrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
        totalBookings: { $sum: "$totalReviews" },
      },
    },
  ]);

  const reviewStats = await reviewModel.aggregate([
    {
      $lookup: {
        from: "tours",
        localField: "tour",
        foreignField: "_id",
        as: "tourDetails",
      },
    },
    { $unwind: "$tourDetails" },
    { $match: { "tourDetails.destination": new ObjectId(id) } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: "$rating" },
        ratingDistribution: {
          $push: "$rating",
        },
      },
    },
  ]);

  const stats = {
    destination: {
      _id: destination._id,
      city: destination.city,
      country: destination.country,
      popular: destination.popular,
    },
    tours: tourStats[0] || {
      totalTours: 0,
      totalTravelers: 0,
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      totalBookings: 0,
    },
    reviews: reviewStats[0] || {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: [],
    },
  };

  // Update destination stats
  await destinationModel.findByIdAndUpdate(id, {
    totalTours: stats.tours.totalTours,
    totalReviews: stats.reviews.totalReviews,
    averageRating: Math.round(stats.reviews.averageRating * 10) / 10,
  });

  res.status(200).json({
    status: "success",
    data: {
      stats,
    },
  });
});

const getDestinationTours = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  // Validate destination ID
  if (!id || id.length !== 24) {
    return next(new AppError("Invalid destination ID", 400));
  }

  const destination = await destinationModel.findById(id);

  if (!destination) {
    return next(new AppError("Destination not found", 404));
  }

  const apiFeature = new ApiFeature(
    tourModel.find({ destination: id }).populate("destination", "city country"),
    req.query
  )
    .paginate()
    .fields()
    .filter()
    .search()
    .sort()
    .lean();

  const result = await apiFeature.mongoseQuery;
  const totalCount = await tourModel.countDocuments({ destination: id });
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  res.status(200).json({
    status: "success",
    data: {
      destination: {
        _id: destination._id,
        city: destination.city,
        country: destination.country,
      },
      tours: result,
      pagination: paginationMeta,
    },
  });
});

const searchDestinations = catchAsyncError(async (req, res, next) => {
  const { q, country, popular , limit = 10, page = 1, justCities = false } = req.query;

  // if (!q && !country && !popular) {
  //   return next(new AppError("At least one search parameter is required", 400));
  // }

  let searchQuery = {};

  if (q) {
    searchQuery.$or = [
      { city: { $regex: q, $options: "i" } },
      { country: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  if (country) {
    searchQuery.country = { $regex: country, $options: "i" };
  }

  if (popular === "true") {
    searchQuery.popular = true;
  }

  if (justCities === "true") {
    searchQuery.city = { $exists: true };
  }

  const apiFeature = new ApiFeature(destinationModel.find(searchQuery), {
    limit,
    page,
  })
    .paginate()
    .sort({ popular: -1, averageRating: -1, totalTours: -1 })
    .lean();

  const result = await apiFeature.mongoseQuery;
  const totalCount = await destinationModel.countDocuments(searchQuery);
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  res.status(200).json({
    status: "success",
    data: {
      destinations: result,
      pagination: paginationMeta,
    },
  });
});

const getDestinationsByCategory = catchAsyncError(async (req, res, next) => {
  const { category } = req.params;
  const { limit = 10, page = 1 } = req.query;

  const tourDestinations = await tourModel.distinct("destination", {
    category: { $regex: category, $options: "i" },
  });

  if (tourDestinations.length === 0) {
    return next(
      new AppError(`No destinations found for category: ${category}`, 404)
    );
  }

  const apiFeature = new ApiFeature(
    destinationModel.find({ _id: { $in: tourDestinations } }),
    { limit, page }
  )
    .paginate()
    .sort({ popular: -1, averageRating: -1, totalTours: -1 })
    .lean();

  const result = await apiFeature.mongoseQuery;
  const totalCount = tourDestinations.length;
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  res.status(200).json({
    status: "success",
    data: {
      destinations: result,
      pagination: paginationMeta,
      category,
    },
  });
});

scheduleJob("0 2 * * *", async () => {
  await updatePopularDestinations();
});

export {
  createDestination,
  deleteDestination,
  updateDestination,
  getAllDestinations,
  getDestinationById,
  deleteAllDestinations,
  getPopularDestinations,
  getDestinationStats,
  getDestinationTours,
  searchDestinations,
  getDestinationsByCategory,
};
