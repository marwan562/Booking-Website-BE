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
    minActivityHour,
    maxActivityHour,
    category,
    features,
    priceMin,
    priceMax,
    durationMin,
    durationMax,
    sortBy = "popularity",
  } = req.query;

  if (!destination) {
    return next(new AppError("Destination parameter is required", 400));
  }

  const destinationLower = destination.toLowerCase();

  const destinationData = await destinationModel.find({
    $or: [
      { city: { $regex: `^${destination}$`, $options: "i" } },
      { country: { $regex: `^${destination}$`, $options: "i" } },
    ],
  });

  if (!destinationData || destinationData.length === 0) {
    return next(new AppError("Destination not found", 404));
  }

  const matchedDestination = destinationData[0];

  if (matchedDestination.city?.toLowerCase() === destinationLower) {
    // Category aggregation
    const categoryAggregation = await tourModel.aggregate([
      { $match: { destination: matchedDestination._id } },
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
    ]);

    // Features aggregation
    const featuresAggregation = await tourModel.aggregate([
      { $match: { destination: matchedDestination._id } },
      {
        $match: {
          features: { $exists: true, $ne: null, $not: { $size: 0 } },
        },
      },
      {
        $unwind: {
          path: "$features",
        },
      },
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
    ]);

    // New aggregation for max price and max duration
    const maxPriceAndDurationAggregation = await tourModel.aggregate([
      { $match: { destination: matchedDestination._id } },
      {
        $addFields: {
          durationInDays: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$duration", null] },
                  { $ne: ["$duration", ""] },
                  { $ifNull: ["$duration", false] },
                  {
                    $regexMatch: {
                      input: "$duration",
                      regex: "^(\\d+d)?(\\d+h)?(\\d+m)?$",
                    },
                  },
                ],
              },
              then: {
                $let: {
                  vars: {
                    durationParts: {
                      $regexFind: {
                        input: "$duration",
                        regex: "^(\\d+)?d?(\\d+)?h?(\\d+)?m?$",
                      },
                    },
                  },
                  in: {
                    $add: [
                      {
                        $convert: {
                          input: {
                            $arrayElemAt: ["$$durationParts.captures", 0],
                          },
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                      {
                        $divide: [
                          {
                            $convert: {
                              input: {
                                $arrayElemAt: ["$$durationParts.captures", 1],
                              },
                              to: "double",
                              onError: 0,
                              onNull: 0,
                            },
                          },
                          24, // Convert hours to days
                        ],
                      },
                      {
                        $divide: [
                          {
                            $convert: {
                              input: {
                                $arrayElemAt: ["$$durationParts.captures", 2],
                              },
                              to: "double",
                              onError: 0,
                              onNull: 0,
                            },
                          },
                          1440, // Convert minutes to days (1440 minutes = 1 day)
                        ],
                      },
                    ],
                  },
                },
              },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          maxPrice: { $max: "$price" },
          maxDurationInDays: { $max: "$durationInDays" },
        },
      },
      {
        $project: {
          _id: 0,
          maxPrice: 1,
          maxDurationInDays: 1,
        },
      },
    ]);

    // Build query filters for tours
    let tourQuery = { destination: matchedDestination._id };
    let aggregationPipeline = [];

    aggregationPipeline.push({ $match: tourQuery });

    if (category) {
      aggregationPipeline.push({
        $match: { category: { $regex: category, $options: "i" } },
      });
    }

    if (features) {
      const featuresArray = Array.isArray(features)
        ? features
        : features.split(",");
      aggregationPipeline.push({
        $match: { features: { $all: featuresArray } }, // Changed to $all for stricter matching
      });
    }

    if (priceMin || priceMax) {
      const priceFilter = {};
      if (priceMin) priceFilter.$gte = parseFloat(priceMin);
      if (priceMax) priceFilter.$lte = parseFloat(priceMax);
      aggregationPipeline.push({
        $match: { price: priceFilter },
      });
    }

    aggregationPipeline.push({
      $addFields: {
        durationInHours: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$duration", null] },
                { $ne: ["$duration", ""] },
                { $ifNull: ["$duration", false] },
                {
                  $regexMatch: {
                    input: "$duration",
                    regex: "^(\\d+d)?(\\d+h)?(\\d+m)?$",
                  },
                },
              ],
            },
            then: {
              $let: {
                vars: {
                  durationParts: {
                    $regexFind: {
                      input: "$duration",
                      regex: "^(\\d+)?d?(\\d+)?h?(\\d+)?m?$",
                    },
                  },
                },
                in: {
                  $add: [
                    {
                      $multiply: [
                        {
                          $convert: {
                            input: {
                              $arrayElemAt: ["$$durationParts.captures", 0],
                            },
                            to: "double",
                            onError: 0,
                            onNull: 0,
                          },
                        },
                        24,
                      ],
                    },
                    {
                      $convert: {
                        input: {
                          $arrayElemAt: ["$$durationParts.captures", 1],
                        },
                        to: "double",
                        onError: 0,
                        onNull: 0,
                      },
                    },
                    {
                      $divide: [
                        {
                          $convert: {
                            input: {
                              $arrayElemAt: ["$$durationParts.captures", 2],
                            },
                            to: "double",
                            onError: 0,
                            onNull: 0,
                          },
                        },
                        60,
                      ],
                    },
                  ],
                },
              },
            },
            else: 0,
          },
        },
        durationInMinutes: {
          $multiply: [
            {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$duration", null] },
                    { $ne: ["$duration", ""] },
                    { $ifNull: ["$duration", false] },
                    {
                      $regexMatch: {
                        input: "$duration",
                        regex: "^(\\d+d)?(\\d+h)?(\\d+m)?$",
                      },
                    },
                  ],
                },
                then: {
                  $let: {
                    vars: {
                      durationParts: {
                        $regexFind: {
                          input: "$duration",
                          regex: "^(\\d+)?d?(\\d+)?h?(\\d+)?m?$",
                        },
                      },
                    },
                    in: {
                      $add: [
                        {
                          $multiply: [
                            {
                              $convert: {
                                input: {
                                  $arrayElemAt: ["$$durationParts.captures", 0],
                                },
                                to: "double",
                                onError: 0,
                                onNull: 0,
                              },
                            },
                            24 * 60,
                          ],
                        },
                        {
                          $multiply: [
                            {
                              $convert: {
                                input: {
                                  $arrayElemAt: ["$$durationParts.captures", 1],
                                },
                                to: "double",
                                onError: 0,
                                onNull: 0,
                              },
                            },
                            60,
                          ],
                        },
                        {
                          $convert: {
                            input: {
                              $arrayElemAt: ["$$durationParts.captures", 2],
                            },
                            to: "double",
                            onError: 0,
                            onNull: 0,
                          },
                        },
                      ],
                    },
                  },
                },
                else: 0,
              },
            },
            1,
          ],
        },
        isAvailableToday: {
          $cond: {
            if: "$isRepeated",
            then: {
              $in: [
                { $dayOfWeek: new Date() },
                {
                  $map: {
                    input: "$repeatDays",
                    as: "day",
                    in: {
                      $switch: {
                        branches: [
                          { case: { $eq: ["$$day", "Sunday"] }, then: 1 },
                          { case: { $eq: ["$$day", "Monday"] }, then: 2 },
                          { case: { $eq: ["$$day", "Tuesday"] }, then: 3 },
                          { case: { $eq: ["$$day", "Wednesday"] }, then: 4 },
                          { case: { $eq: ["$$day", "Thursday"] }, then: 5 },
                          { case: { $eq: ["$$day", "Friday"] }, then: 6 },
                          { case: { $eq: ["$$day", "Saturday"] }, then: 7 },
                        ],
                        default: 0,
                      },
                    },
                  },
                },
              ],
            },
            else: {
              $and: [
                { $lte: ["$date.from", new Date()] },
                { $gte: ["$date.to", new Date()] },
              ],
            },
          },
        },
      },
    });

    if (durationMin || durationMax) {
      const durationFilter = {};
      if (durationMin) durationFilter.$gte = parseInt(durationMin) * 60;
      if (durationMax) durationFilter.$lte = parseInt(durationMax) * 60;
      aggregationPipeline.push({
        $match: { durationInMinutes: durationFilter },
      });
    }

    if (availability) {
      const now = new Date();
      let targetDate;

      switch (availability) {
        case "today":
          targetDate = now;
          aggregationPipeline.push({ $match: { isAvailableToday: true } });
          break;
        case "tomorrow":
          targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          const tomorrowDay = targetDate.getDay() + 1;
          aggregationPipeline.push({
            $match: {
              $expr: {
                $or: [
                  {
                    $and: [
                      { $eq: ["$isRepeated", true] },
                      {
                        $in: [
                          tomorrowDay,
                          {
                            $map: {
                              input: "$repeatDays",
                              as: "day",
                              in: {
                                $switch: {
                                  branches: [
                                    {
                                      case: { $eq: ["$$day", "Sunday"] },
                                      then: 1,
                                    },
                                    {
                                      case: { $eq: ["$$day", "Monday"] },
                                      then: 2,
                                    },
                                    {
                                      case: { $eq: ["$$day", "Tuesday"] },
                                      then: 3,
                                    },
                                    {
                                      case: { $eq: ["$$day", "Wednesday"] },
                                      then: 4,
                                    },
                                    {
                                      case: { $eq: ["$$day", "Thursday"] },
                                      then: 5,
                                    },
                                    {
                                      case: { $eq: ["$$day", "Friday"] },
                                      then: 6,
                                    },
                                    {
                                      case: { $eq: ["$$day", "Saturday"] },
                                      then: 7,
                                    },
                                  ],
                                  default: 0,
                                },
                              },
                            },
                          },
                        ],
                      },
                    ],
                  },
                  {
                    $and: [
                      { $eq: ["$isRepeated", false] },
                      { $lte: ["$date.from", targetDate] },
                      { $gte: ["$date.to", targetDate] },
                    ],
                  },
                ],
              },
            },
          });
          break;
      }
    }

    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      aggregationPipeline.push({
        $match: {
          $or: [
            { isRepeated: true },
            {
              isRepeated: false,
              $and: [
                { "date.from": { $lte: toDate } },
                { "date.to": { $gte: fromDate } },
              ],
            },
          ],
        },
      });
    }

    if (minActivityHour || maxActivityHour || startTime) {
      const timeFilter = {};

      if (startTime) {
        const [hours, minutes] = startTime.split(":").map(Number);
        const startMinutes = hours * 60 + (minutes || 0);

        aggregationPipeline.push({
          $match: {
            $or: [
              { repeatTime: { $exists: false } },
              { repeatTime: { $size: 0 } },
              {
                repeatTime: {
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
                },
              },
            ],
          },
        });
      }
    }

    let sortStage = {};
    switch (sortBy) {
      case "popularity":
        sortStage = { totalTravelers: -1, averageRating: -1 };
        break;
      case "best-rated":
        sortStage = { averageRating: -1, totalReviews: -1 };
        break;
      case "price-low":
        sortStage = { price: 1 };
        break;
      case "price-high":
        sortStage = { price: -1 };
        break;
      case "new":
        sortStage = { createdAt: -1 };
        break;
      case "duration-short":
        sortStage = { durationInMinutes: 1 };
        break;
      case "duration-long":
        sortStage = { durationInMinutes: -1 };
        break;
      default:
        sortStage = { totalTravelers: -1, averageRating: -1 };
    }

    aggregationPipeline.push({ $sort: sortStage });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: parseInt(limit) });

    const tours = await tourModel.aggregate(aggregationPipeline);

    const countPipeline = aggregationPipeline.slice(0, -2);
    const totalCountResult = await tourModel.aggregate([
      ...countPipeline,
      { $count: "total" },
    ]);

    const totalCount =
      totalCountResult.length > 0 ? totalCountResult[0].total : 0;
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
        features,
        priceMin,
        priceMax,
        durationMin,
        durationMax,
        sortBy,
      },
      data: {
        tours,
        pagination: paginationMeta,
        categories: categoryAggregation,
        features: featuresAggregation,
        maxPrice: maxPriceAndDurationAggregation[0]?.maxPrice || 0,
        maxDurationInDays:
          maxPriceAndDurationAggregation[0]?.maxDurationInDays || 0,
      },
    });
  }

  if (matchedDestination.country?.toLowerCase() === destinationLower) {
    const filter = { country: { $regex: `^${destination}$`, $options: "i" } };

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
