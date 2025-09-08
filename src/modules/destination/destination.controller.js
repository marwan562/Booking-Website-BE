import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { removeImage } from "../../middlewares/deleteImg.js";
import { AppError } from "../../utilities/AppError.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import { ObjectId } from "mongodb";
import destinationModel from "../../models/destinationModel.js";
import tourModel from "../../models/tourModel.js";
import { updatePopularDestinations } from "../../../utilities/updatePopularDestinations.js";
import { scheduleJob } from "node-schedule";
import reviewModel from "../../models/reviewModel.js";

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

const getDestination = catchAsyncError(async (req, res, next) => {
  const { destination } = req.params;
  const {
    page = 1,
    limit = 10,
    availability,
    dateFrom,
    dateTo,
    startTime,
    category,
    features: queryFeatures,
    priceMin,
    priceMax,
    durationMin,
    durationMax,
    sortBy = "popularity",
  } = req.query;

  if (!destination) {
    return next(new AppError("Destination parameter is required", 400));
  }

  const destinationLower = destination.toLowerCase().trim();

  console.log(`Request for destination: ${destinationLower}`, {
    query: req.query,
    sortBy,
  });

  const validSortOptions = [
    "popularity",
    "best-rated",
    "price-low",
    "price-high",
    "new",
    "duration-short",
    "duration-long",
  ];
  const effectiveSortBy = validSortOptions.includes(sortBy)
    ? sortBy
    : "popularity";
  if (sortBy !== effectiveSortBy) {
    console.log(
      `Invalid sortBy value: ${sortBy}. Defaulting to: ${effectiveSortBy}`
    );
  }

  const destinationData = await destinationModel
    .findOne({
      $or: [
        { city: { $regex: `^${destinationLower}$`, $options: "i" } },
        { country: { $regex: `^${destinationLower}$`, $options: "i" } },
      ],
    })
    .lean();

  if (!destinationData) {
    console.log(`No destination found for: ${destinationLower}`);
    console.log(
      `Available cities: ${await destinationModel.distinct("city")}`,
      `Available countries: ${await destinationModel.distinct("country")}`
    );
    return next(new AppError("Destination not found", 404));
  }

  const matchedDestination = destinationData;

  if (matchedDestination.city?.toLowerCase() === destinationLower) {
    // Build query filters for tours
    let matchStage = { destination: matchedDestination._id };

    if (category) {
      matchStage.category = {
        $in: Array.isArray(category)
          ? category
          : category.split(",").map((c) => c.trim()),
      };
    }

    if (queryFeatures) {
      const featuresArray = Array.isArray(queryFeatures)
        ? queryFeatures
        : queryFeatures.split(",").map((f) => f.trim());
      matchStage.features = { $all: featuresArray };
    }

    if (priceMin || priceMax) {
      matchStage.price = {};
      if (priceMin && !isNaN(parseFloat(priceMin)))
        matchStage.price.$gte = parseFloat(priceMin);
      if (priceMax && !isNaN(parseFloat(priceMax)))
        matchStage.price.$lte = parseFloat(priceMax);
    }

    if (durationMin || durationMax) {
      matchStage.durationInMinutes = {};
      if (durationMin && !isNaN(parseInt(durationMin)))
        matchStage.durationInMinutes.$gte = parseInt(durationMin) * 60;
      if (durationMax && !isNaN(parseInt(durationMax)))
        matchStage.durationInMinutes.$lte = parseInt(durationMax) * 60;
    }

    if (availability) {
      const now = new Date();
      let targetDate;

      switch (availability) {
        case "today":
          targetDate = now;
          matchStage.isAvailableToday = true;
          break;
        case "tomorrow":
          targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          const tomorrowDay = targetDate.getDay() + 1;
          matchStage.$or = [
            {
              isRepeated: true,
              repeatDays: {
                $in: [
                  tomorrowDay === 1
                    ? "Sunday"
                    : tomorrowDay === 2
                    ? "Monday"
                    : tomorrowDay === 3
                    ? "Tuesday"
                    : tomorrowDay === 4
                    ? "Wednesday"
                    : tomorrowDay === 5
                    ? "Thursday"
                    : tomorrowDay === 6
                    ? "Friday"
                    : "Saturday",
                ],
              },
            },
            {
              isRepeated: false,
              "date.from": { $lte: targetDate },
              "date.to": { $gte: targetDate },
            },
          ];
          break;
        default:
          console.log(`Invalid availability value: ${availability}`);
      }
    }

    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      if (!isNaN(fromDate) && !isNaN(toDate)) {
        matchStage.$or = [
          { isRepeated: true },
          {
            isRepeated: false,
            "date.from": { $lte: toDate },
            "date.to": { $gte: fromDate },
          },
        ];
      }
    }

    if (startTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const startMinutes = hours * 60 + (minutes || 0);
        matchStage.repeatTime = {
          $elemMatch: {
            $expr: {
              $lte: [
                {
                  $abs: {
                    $subtract: [
                      startMinutes,
                      {
                        $add: [
                          {
                            $multiply: [
                              { $toInt: { $substr: ["$$this", 0, 2] } },
                              60,
                            ],
                          },
                          { $toInt: { $substr: ["$$this", 3, 2] } },
                        ],
                      },
                    ],
                  },
                },
                60,
              ],
            },
          },
        };
      }
    }

    const sortStage = (() => {
      switch (effectiveSortBy) {
        case "popularity":
          return { totalTravelers: -1, averageRating: -1 };
        case "best-rated":
          return { averageRating: -1, totalReviews: -1 };
        case "price-low":
          return { price: 1 };
        case "price-high":
          return { price: -1 };
        case "new":
          return { createdAt: -1 };
        case "duration-short-long":
          return { durationInMinutes: 1 };
        case "duration-long-short":
          return { durationInMinutes: -1 };
        default:
          return { totalTravelers: -1, averageRating: -1 }; // Fallback
      }
    })();

    // Updated aggregation pipeline section for your getDestination controller

    const aggregationPipeline = [
      { $match: matchStage },
      {
        $facet: {
          tours: [
            { $sort: sortStage },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
                price: 1,
                destination:1,
                discountPercent: 1,
                averageRating: 1,
                totalReviews: 1,
                totalTravelers: 1,
                duration: 1,
                category: 1,
                features: 1,
                slug: 1,
                mainImg: 1,
              },
            },
          ],
          totalCount: [{ $count: "total" }],
          categories: [
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
            { $sort: { category: 1 } },
          ],
          features: [
            {
              $match: {
                features: { $exists: true, $ne: [], $not: { $size: 0 } },
              },
            },
            { $unwind: "$features" },
            {
              $group: {
                _id: "$features",
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                feature: "$_id",
                count: 1,
              },
            },
            { $sort: { feature: 1 } },
          ],
          maxPriceAndDuration: [
            {
              $addFields: {
                // Calculate durationInDays if it doesn't exist
                calculatedDurationInDays: {
                  $cond: {
                    if: { $ifNull: ["$durationInDays", false] },
                    then: "$durationInDays",
                    else: {
                      $cond: {
                        if: { $ifNull: ["$durationInMinutes", false] },
                        then: {
                          $ceil: {
                            $divide: [
                              "$durationInMinutes",
                              { $multiply: [24, 60] },
                            ],
                          },
                        },
                        else: 1, // Default to 1 day if no duration data
                      },
                    },
                  },
                },
              },
            },
            {
              $group: {
                _id: null,
                maxPrice: { $max: "$price" },
                maxDurationInDays: { $max: "$calculatedDurationInDays" },
              },
            },
            {
              $project: {
                _id: 0,
                maxPrice: 1,
                maxDurationInDays: 1,
              },
            },
          ],
        },
      },
    ];

    // Alternative simpler approach if you prefer
    const alternativeAggregationPipeline = [
      { $match: matchStage },
      {
        $addFields: {
          // Ensure durationInDays exists for all documents
          effectiveDurationInDays: {
            $cond: {
              if: { $gt: ["$durationInDays", 0] },
              then: "$durationInDays",
              else: {
                $cond: {
                  if: { $gt: ["$durationInMinutes", 0] },
                  then: { $ceil: { $divide: ["$durationInMinutes", 1440] } }, // 1440 = 24*60 minutes in a day
                  else: 1,
                },
              },
            },
          },
        },
      },
      {
        $facet: {
          tours: [
            { $sort: sortStage },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
                price: 1,
                discountPercent: 1,
                averageRating: 1,
                totalReviews: 1,
                totalTravelers: 1,
                mainImg: 1,
                duration: 1,
                category: 1,
                features: 1,
                slug: 1,
              },
            },
          ],
          totalCount: [{ $count: "total" }],
          categories: [
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
            { $sort: { category: 1 } },
          ],
          features: [
            {
              $match: {
                features: { $exists: true, $ne: [], $not: { $size: 0 } },
              },
            },
            { $unwind: "$features" },
            {
              $group: {
                _id: "$features",
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                feature: "$_id",
                count: 1,
              },
            },
            { $sort: { feature: 1 } },
          ],
          maxPriceAndDuration: [
            {
              $group: {
                _id: null,
                maxPrice: { $max: "$price" },
                maxDurationInDays: { $max: "$effectiveDurationInDays" },
              },
            },
            {
              $project: {
                _id: 0,
                maxPrice: 1,
                maxDurationInDays: 1,
              },
            },
          ],
        },
      },
    ];

    const results = await tourModel.aggregate(aggregationPipeline);

    const tours = results[0].tours || [];
    const totalCount = results[0].totalCount[0]?.total || 0;
    const categories = results[0].categories || [];
    const features = results[0].features || [];
    const maxPrice = results[0].maxPriceAndDuration[0]?.maxPrice || 0;
    const maxDurationInDays =
      results[0].maxPriceAndDuration[0]?.maxDurationInDays || 0;

    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    const paginationMeta = {
      currentPage: parseInt(page),
      totalPages,
      totalItems: totalCount,
      hasNextPage,
      hasPrevPage,
      limit: parseInt(limit),
    };

    return res.status(200).json({
      status: "success",
      type: "city",
      destination: matchedDestination,
      filters: {
        availability,
        dateFrom,
        dateTo,
        startTime,
        category,
        features: queryFeatures,
        priceMin,
        priceMax,
        durationMin,
        durationMax,
        sortBy: effectiveSortBy,
      },
      data: {
        tours,
        pagination: paginationMeta,
        categories,
        features,
        maxPrice,
        maxDurationInDays,
      },
    });
  }

  if (matchedDestination.country?.toLowerCase() === destinationLower) {
    const filter = {
      country: { $regex: `^${destinationLower}$`, $options: "i" },
    };
    const apiFeature = new ApiFeature(destinationModel.find(filter), {
      limit,
      page,
    })
      .paginate()
      .sort()
      .lean();

    const cities = await apiFeature.mongoseQuery;
    const totalCities = await destinationModel.countDocuments(filter);

    const totalTravelers = cities.reduce(
      (sum, city) => sum + (city.totalTravelers || 0),
      0
    );
    const totalTours = cities.reduce(
      (sum, city) => sum + (city.totalTours || 0),
      0
    );
    const totalReviews = cities.reduce(
      (sum, city) => sum + (city.totalReviews || 0),
      0
    );

    const averageRating =
      cities.length > 0
        ? cities.reduce((sum, city) => sum + (city.averageRating || 0), 0) /
          cities.length
        : 0;
    const averageRatingRounded = Math.round(averageRating * 10) / 10;

    const paginationMeta = apiFeature.getPaginationMeta(totalCities);

    return res.status(200).json({
      status: "success",
      type: "country",
      destination: matchedDestination,
      lengthCities: totalCities,
      totalTravelers,
      totalTours,
      totalReviews,
      averageRating: averageRatingRounded,
      data: {
        cities,
        pagination: paginationMeta,
      },
    });
  }

  return next(new AppError("No matching city or country found", 404));
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
  // Validate destination ID
  if (!id || id.length !== 24) {
    return next(new AppError("Invalid destination ID", 400));
  }

  const destinationData = await destinationModel.find();

  if (!destinationData) {
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
      destination: destinationData,
      tours: result,
      pagination: paginationMeta,
    },
  });
});

const searchDestinations = catchAsyncError(async (req, res, next) => {
  const {
    q,
    country,
    popular,
    limit = 10,
    page = 1,
    justCities = false,
  } = req.query;
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
  getDestination,
  deleteAllDestinations,
  getPopularDestinations,
  getDestinationStats,
  getDestinationTours,
  searchDestinations,
  getDestinationsByCategory,
};
