import tourModel from "../../models/tourModel.js";
import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { removeImage } from "../../middlewares/deleteImg.js";
import { AppError } from "../../utilities/AppError.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import { ObjectId } from "mongodb";
import destinationModel from "../../models/destinationModel.js";

const getCategories = catchAsyncError(async (req, res) => {
  try {
    const categories = await tourModel.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1,
        },
      },
      {
        $sort: { category: 1 },
      },
    ]);

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories", error });
  }
});

const createTour = catchAsyncError(async (req, res, next) => {
  // Validate required fields
  const {
    title,
    description,
    category,
    location,
    destination,
    discountPercent,
  } = req.body;

  if (!title || !description || !category || !location) {
    return next(
      new AppError(
        "Missing required fields: title, description, category, location",
        400
      )
    );
  }

  if (discountPercent > 0) {
    req.body.hasOffer = true;
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

  const destinationExists = await destinationModel.findById(destination);

  if (!destinationExists) {
    return next(new AppError("Destination not found", 404));
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

export const getTourBySlug = async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const tour = await tourModel.findOne({ slug }).populate({
      path: "destination",
      select: "city country",
    });
    if (!tour) return next(new AppError("Tour not found", 404));
    res.status(200).json({ status: "success", tour });
  } catch (error) {
    next(error);
  }
};

const getAllTour = catchAsyncError(async (req, res, next) => {
  const apiFeature = new ApiFeature(
    tourModel.find().populate({ path: "destination", select: "city country" }),
    req.query
  )
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
    return next(new AppError("No tours found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      tours: result,
      pagination: paginationMeta,
    },
  });
});

const getTourById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  // Validate tour ID
  if (!id || id.length !== 24) {
    return next(new AppError("Invalid tour ID", 400));
  }

  // Use optimized query with lean
  const tour = await tourModel.findById(id).lean();

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
  for (const tourOrder of req.body) {
    if (!tourOrder.id || !tourOrder.quantity) {
      return next(
        new AppError(
          "Each tour order must have 'id' and 'quantity' fields",
          400
        )
      );
    }

    // Validate tour ID format
    if (tourOrder.id.length !== 24) {
      return next(new AppError("Invalid tour ID format", 400));
    }

    // Validate quantity
    if (tourOrder.quantity <= 0) {
      return next(new AppError("Quantity must be greater than 0", 400));
    }
  }

  // Use bulk operations for better performance
  const tourIds = req.body.map((order) => new ObjectId(order.id));

  // Fetch tours in bulk
  const tours = await tourModel
    .find({
      _id: { $in: tourIds },
    })
    .lean();

  if (tours.length !== req.body.length) {
    return next(new AppError("One or more tours not found", 404));
  }

  // Process orders
  const processedOrders = req.body.map((order) => {
    const tour = tours.find((t) => t._id.toString() === order.id);
    return {
      tourId: order.id,
      tourTitle: tour.title,
      quantity: order.quantity,
      price: tour.price,
      totalPrice: tour.price * order.quantity,
    };
  });

  const totalAmount = processedOrders.reduce(
    (sum, order) => sum + order.totalPrice,
    0
  );

  res.status(200).json({
    status: "success",
    data: {
      orders: processedOrders,
      totalAmount,
      orderCount: processedOrders.length,
    },
  });
});

const getToursByCategory = catchAsyncError(async (req, res, next) => {
  const { category } = req.params;
  const { limit = 10, page = 1 } = req.query;

  const apiFeature = new ApiFeature(
    tourModel.find({ category: { $regex: category, $options: "i" } }),
    { limit, page }
  )
    .paginate()
    .sort()
    .lean();

  const result = await apiFeature.mongoseQuery;
  const totalCount = await tourModel.countDocuments({
    category: { $regex: category, $options: "i" },
  });
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  res.status(200).json({
    status: "success",
    data: {
      tours: result,
      pagination: paginationMeta,
      category,
    },
  });
});

const getToursWithOffers = catchAsyncError(async (req, res, next) => {
  const { limit = 10, page = 1 } = req.query;

  const apiFeature = new ApiFeature(tourModel.find({ hasOffer: true }), {
    limit,
    page,
  })
    .paginate()
    .sort()
    .lean();

  const result = await apiFeature.mongoseQuery;
  const totalCount = await tourModel.countDocuments({ hasOffer: true });
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  res.status(200).json({
    status: "success",
    data: {
      tours: result,
      pagination: paginationMeta,
    },
  });
});

const searchTours = catchAsyncError(async (req, res, next) => {
  const { q, limit = 10, page = 1 } = req.query;

  if (!q) {
    return next(new AppError("Search query is required", 400));
  }

  const apiFeature = new ApiFeature(
    tourModel
      .find({
        $or: [
          { title: { $regex: `^${q}$`, $options: "i" } },
          { description: { $regex: `^${q}$`, $options: "i" } },
        ],
      })
      .populate("destination", "city country"),
    { limit, page }
  )
    .paginate()
    .sort({ score: { $meta: "textScore" } })
    .lean();

  const result = await apiFeature.mongoseQuery;
  const totalCount = await tourModel.countDocuments({
    $or: [
      { title: { $regex: `^${q}$`, $options: "i" } },
      { description: { $regex: `^${q}$`, $options: "i" } },
    ],
  });
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  res.status(200).json({
    status: "success",
    data: {
      tours: result,
      pagination: paginationMeta,
      searchQuery: q,
    },
  });
});

export {
  getCategories,
  createTour,
  deleteTour,
  updateTour,
  getAllTour,
  getTourById,
  deleteAllTour,
  orderTour,
  getToursByCategory,
  getToursWithOffers,
  searchTours,
};
