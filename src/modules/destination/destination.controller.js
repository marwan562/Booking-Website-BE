import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { removeImage } from "../../middlewares/deleteImg.js";
import { AppError } from "../../utilities/AppError.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import { ObjectId } from "mongodb";
import destinationModel from "../../models/destinationModel.js";
import tourModel from "../../models/tourModel.js";
import reviewModel from "../../models/reviewModel.js";
import { updatePopularDestinations } from "../../../utilities/updatePopularDestinations.js";
import { scheduleJob } from "node-schedule";
import { transformTours } from "../tour/tour.controller.js";

const getLocalizedValue = (field, locale = "en") => {
  if (!field || typeof field !== "object") return field;
  return field[locale] || field.en || field[Object.keys(field)[0]] || "";
};

const transformDestination = (destination, locale = "en") => {
  if (!destination) return null;
  return {
    ...destination,
    city: getLocalizedValue(destination.city, locale),
    country: getLocalizedValue(destination.country, locale),
    description: getLocalizedValue(destination.description, locale),
  };
};

const transformDestinations = (destinations, locale = "en") =>
  destinations.map((dest) => transformDestination(dest, locale));

const buildLocalizedQuery = (value) => ({
  $or: [
    { "city.en": { $regex: value, $options: "i" } },
    { "city.ar": { $regex: value, $options: "i" } },
    { "city.es": { $regex: value, $options: "i" } },
  ].filter(Boolean),
});

const getSortStage = (sortBy) => {
  const validSortOptions = {
    popularity: { totalTravelers: -1, averageRating: -1 },
    "best-rated": { averageRating: -1, totalReviews: -1 },
    "price-low": { price: 1 },
    "price-high": { price: -1 },
    new: { createdAt: -1 },
    "duration-short": { durationInMinutes: 1 },
    "duration-long": { durationInMinutes: -1 },
  };
  return validSortOptions[sortBy] || validSortOptions.popularity;
};

const buildTourMatchStage = ({
  destinationIds,
  category,
  features,
  priceMin,
  priceMax,
  durationMin,
  durationMax,
  availability,
  dateFrom,
  dateTo,
  startTime,
  locale = "en",
}) => {
  const matchStage = {};

  if (destinationIds) {
    matchStage.destination = Array.isArray(destinationIds)
      ? { $in: destinationIds }
      : { $eq: destinationIds };
  }

  if (category) {
    const categories = Array.isArray(category)
      ? category
      : category.split(",").map((c) => c.trim());

    matchStage[`category.${locale}`] = { $in: categories };
  }

  if (features && features.length > 0) {
    const featureList = Array.isArray(features)
      ? features
      : features.split(",").map((f) => f.trim());

    matchStage[`features.${locale}`] = { $all: featureList };
  }

  if (priceMin || priceMax) {
    matchStage.price = {};
    if (priceMin && !isNaN(priceMin)) {
      matchStage.price.$gte = parseFloat(priceMin);
    }
    if (priceMax && !isNaN(priceMax)) {
      matchStage.price.$lte = parseFloat(priceMax);
    }
  }

  if (durationMin || durationMax) {
    matchStage.durationInMinutes = {};
    if (durationMin && !isNaN(durationMin)) {
      matchStage.durationInMinutes.$gte = parseInt(durationMin) * 60;
    }
    if (durationMax && !isNaN(durationMax)) {
      matchStage.durationInMinutes.$lte = parseInt(durationMax) * 60;
    }
  }

  const orConditions = [];

  if (availability) {
    const now = new Date();

    if (availability === "today") {
      matchStage.isAvailableToday = true;
    }

    if (availability === "tomorrow") {
      const targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dayName = targetDate.toLocaleString("en-US", { weekday: "long" });

      orConditions.push(
        {
          isRepeated: true,
          repeatDays: { $in: [dayName] },
        },
        {
          isRepeated: false,
          "date.from": { $lte: targetDate },
          "date.to": { $gte: targetDate },
        }
      );
    }
  }

  if (dateFrom && dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (!isNaN(from) && !isNaN(to)) {
      orConditions.push(
        { isRepeated: true },
        {
          isRepeated: false,
          "date.from": { $lte: to },
          "date.to": { $gte: from },
        }
      );
    }
  }

  if (orConditions.length > 0) {
    matchStage.$or = orConditions;
  }

  if (startTime) {
    matchStage.__startTime = startTime;
  }

  return matchStage;
};

const buildTourAggregationPipeline = (matchStage, sortStage, page, limit) => [
  { $match: matchStage },
  {
    $addFields: {
      effectiveDurationInDays: {
        $cond: {
          if: { $gt: ["$durationInDays", 0] },
          then: "$durationInDays",
          else: {
            $cond: {
              if: { $gt: ["$durationInMinutes", 0] },
              then: { $ceil: { $divide: ["$durationInMinutes", 1440] } },
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
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $project: { _id: 0, category: "$_id", count: 1 } },
        { $sort: { category: 1 } },
      ],
      features: [
        {
          $match: { features: { $exists: true, $ne: [], $not: { $size: 0 } } },
        },
        { $unwind: "$features" },
        { $group: { _id: "$features", count: { $sum: 1 } } },
        { $project: { _id: 0, feature: "$_id", count: 1 } },
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
        { $project: { _id: 0, maxPrice: 1, maxDurationInDays: 1 } },
      ],
    },
  },
];

export const getDestination = catchAsyncError(async (req, res, next) => {
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
    locale = "en",
  } = req.query;

  // Validate inputs
  if (!destination) {
    return next(new AppError("Destination parameter is required", 400));
  }
  const validLocales = ["en", "ar", "es"];
  if (!validLocales.includes(locale)) {
    return next(new AppError("Invalid locale. Use 'en', 'ar', or 'es'", 400));
  }

  const destinationLower = destination.trim().toLowerCase();

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

  const destinationData = await destinationModel
    .findOne({
      $or: [
        { "city.en": { $regex: `^${destinationLower}$`, $options: "i" } },
        { "city.ar": { $regex: `^${destinationLower}$`, $options: "i" } },
        { "city.es": { $regex: `^${destinationLower}$`, $options: "i" } },
        { "country.en": { $regex: `^${destinationLower}$`, $options: "i" } },
        { "country.ar": { $regex: `^${destinationLower}$`, $options: "i" } },
        { "country.es": { $regex: `^${destinationLower}$`, $options: "i" } },
      ],
    })
    .lean();

  if (!destinationData) {
    console.log(`No destination found for: ${destinationLower}`);
    return next(new AppError("Destination not found", 404));
  }

  const isCityMatch =
    destinationData.city?.en?.toLowerCase() === destinationLower ||
    destinationData.city?.ar?.toLowerCase() === destinationLower ||
    destinationData.city?.es?.toLowerCase() === destinationLower;

  if (isCityMatch) {
    const matchStage = buildTourMatchStage({
      destinationIds: [destinationData._id],
      category,
      features: queryFeatures,
      priceMin,
      priceMax,
      durationMin,
      durationMax,
      availability,
      dateFrom,
      dateTo,
      startTime,
      locale,
    });

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
        case "duration-short":
          return { durationInMinutes: 1 };
        case "duration-long":
          return { durationInMinutes: -1 };
        default:
          return { totalTravelers: -1, averageRating: -1 };
      }
    })();

    const apiFeature = new ApiFeature(
      tourModel.find(matchStage).populate("destination", "city country"),
      { page, limit }
    )
      .paginate()
      .sort(sortStage)
      .fields(
        "title description price discountPercent averageRating totalReviews totalTravelers duration category features slug mainImg"
      )
      .lean();

    const tours = await apiFeature.mongoseQuery;
    const totalCount = await tourModel.countDocuments(matchStage);
    const paginationMeta = apiFeature.getPaginationMeta(totalCount);

    const transformedTours = tours.map((tour) => ({
      ...tour,
      title: getLocalizedValue(tour.title, locale),
      slug: getLocalizedValue(tour.slug, locale),
      description: getLocalizedValue(tour.description, locale),
      category: getLocalizedValue(tour.category, locale),
      features: tour.features
        ? tour.features.map((f) => getLocalizedValue(f, locale))
        : [],
      destination: transformDestination(tour.destination, locale),
    }));

    const [categories, featuresData] = await Promise.all([
      tourModel
        .aggregate([
          { $match: { destination: destinationData._id } },
          { $group: { _id: `$category.${locale}`, count: { $sum: 1 } } },
          { $project: { _id: 0, category: "$_id", count: 1 } },
          { $sort: { category: 1 } },
        ])
        .allowDiskUse(true),
      tourModel
        .aggregate([
          {
            $match: {
              destination: destinationData._id,
              features: { $exists: true, $ne: [] },
            },
          },
          { $unwind: "$features" },
          { $group: { _id: `$features.${locale}`, count: { $sum: 1 } } },
          { $project: { _id: 0, feature: "$_id", count: 1 } },
          { $sort: { feature: 1 } },
        ])
        .allowDiskUse(true),
    ]);

    const maxStats = await tourModel
      .aggregate([
        { $match: { destination: destinationData._id } },
        {
          $group: {
            _id: null,
            maxPrice: { $max: "$price" },
            maxDurationInDays: {
              $max: {
                $cond: {
                  if: { $gt: ["$durationInDays", 0] },
                  then: "$durationInDays",
                  else: { $ceil: { $divide: ["$durationInMinutes", 1440] } },
                },
              },
            },
          },
        },
        { $project: { _id: 0, maxPrice: 1, maxDurationInDays: 1 } },
      ])
      .allowDiskUse(true);

    const maxPrice = maxStats[0]?.maxPrice || 0;
    const maxDurationInDays = maxStats[0]?.maxDurationInDays || 0;

    return res.status(200).json({
      status: "success",
      type: "city",
      destination: transformDestination(destinationData, locale),
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
        locale,
      },
      data: {
        tours: transformedTours,
        pagination: paginationMeta,
        categories,
        features: featuresData,
        maxPrice,
        maxDurationInDays,
      },
    });
  }

  const isCountryMatch =
    destinationData.country?.en?.toLowerCase() === destinationLower ||
    destinationData.country?.ar?.toLowerCase() === destinationLower ||
    destinationData.country?.es?.toLowerCase() === destinationLower;

  if (!isCountryMatch) {
    return next(new AppError("No matching city or country found", 404));
  }

  const cities = await destinationModel
    .find({
      $or: [
        { "country.en": { $regex: `^${destinationLower}$`, $options: "i" } },
        { "country.ar": { $regex: `^${destinationLower}$`, $options: "i" } },
        { "country.es": { $regex: `^${destinationLower}$`, $options: "i" } },
      ],
    })
    .lean();

  if (!cities?.length) {
    return next(new AppError("No cities found for this country", 404));
  }

  const destinationIds = cities.map((city) => city._id);
  const matchStage = buildTourMatchStage({
    destinationIds,
    category,
    features: queryFeatures,
    priceMin,
    priceMax,
    durationMin,
    durationMax,
    availability,
    dateFrom,
    dateTo,
    startTime,
    locale,
  });

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
      case "duration-short":
        return { durationInMinutes: 1 };
      case "duration-long":
        return { durationInMinutes: -1 };
      default:
        return { totalTravelers: -1, averageRating: -1 };
    }
  })();

  const apiFeature = new ApiFeature(
    tourModel.find(matchStage).populate("destination", "city country"),
    { page, limit }
  )
    .paginate()
    .sort(sortStage)
    .fields(
      "title description price discountPercent averageRating totalReviews totalTravelers duration category features slug mainImg"
    )
    .lean();

  const tours = await apiFeature.mongoseQuery;
  const totalCount = await tourModel.countDocuments(matchStage);
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  const transformedTours = tours.map((tour) => ({
    ...tour,
    title: getLocalizedValue(tour.title, locale),
    description: getLocalizedValue(tour.description, locale),
    category: getLocalizedValue(tour.category, locale),
    features: tour.features
      ? tour.features.map((f) => getLocalizedValue(f, locale))
      : [],
    destination: transformDestination(tour.destination, locale),
  }));

  const stats = await destinationModel
    .aggregate([
      {
        $match: {
          $or: [
            {
              "country.en": { $regex: `^${destinationLower}$`, $options: "i" },
            },
            {
              "country.ar": { $regex: `^${destinationLower}$`, $options: "i" },
            },
            {
              "country.es": { $regex: `^${destinationLower}$`, $options: "i" },
            },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalTravelers: { $sum: "$totalTravelers" },
          totalTours: { $sum: "$totalTours" },
          totalReviews: { $sum: "$totalReviews" },
          averageRating: { $avg: "$averageRating" },
        },
      },
    ])
    .allowDiskUse(true);

  const totalTravelers = stats[0]?.totalTravelers || 0;
  const totalTours = stats[0]?.totalTours || totalCount;
  const totalReviews = stats[0]?.totalReviews || 0;
  const averageRating = stats[0]?.averageRating
    ? Math.round(stats[0].averageRating * 10) / 10
    : 0;

  const [categories, featuresData] = await Promise.all([
    tourModel
      .aggregate([
        { $match: matchStage },
        { $group: { _id: `$category.${locale}`, count: { $sum: 1 } } },
        { $project: { _id: 0, category: "$_id", count: 1 } },
        { $sort: { category: 1 } },
      ])
      .allowDiskUse(true),
    tourModel
      .aggregate([
        { $match: { ...matchStage, features: { $exists: true, $ne: [] } } },
        { $unwind: "$features" },
        { $group: { _id: `$features.${locale}`, count: { $sum: 1 } } },
        { $project: { _id: 0, feature: "$_id", count: 1 } },
        { $sort: { feature: 1 } },
      ])
      .allowDiskUse(true),
  ]);

  const maxStats = await tourModel
    .aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          maxPrice: { $max: "$price" },
          maxDurationInDays: {
            $max: {
              $cond: {
                if: { $gt: ["$durationInDays", 0] },
                then: "$durationInDays",
                else: { $ceil: { $divide: ["$durationInMinutes", 1440] } },
              },
            },
          },
        },
      },
      { $project: { _id: 0, maxPrice: 1, maxDurationInDays: 1 } },
    ])
    .allowDiskUse(true);

  const maxPrice = maxStats[0]?.maxPrice || 0;
  const maxDurationInDays = maxStats[0]?.maxDurationInDays || 0;

  return res.status(200).json({
    status: "success",
    type: "country",
    destination: transformDestination(destinationData, locale),
    lengthCities: cities.length,
    totalTravelers,
    totalTours,
    totalReviews,
    averageRating,
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
      locale,
    },
    data: {
      tours: transformedTours,
      cities: transformDestinations(cities, locale),
      pagination: paginationMeta,
      categories,
      features: featuresData,
      maxPrice,
      maxDurationInDays,
    },
  });
});

export const createDestination = catchAsyncError(async (req, res, next) => {
  const { city, country } = req.body;
  if (!country)
    return next(new AppError("Missing required field: country", 400));

  const cityValue = city?.en || city?.ar || city?.es || "";
  const countryValue = country.en || country.ar || country.es || "";
  if (!cityValue || !countryValue)
    return next(new AppError("Missing city or country values", 400));

  const query = {
    ...buildLocalizedQuery(cityValue),
    $or: [
      { "country.en": { $regex: countryValue, $options: "i" } },
      { "country.ar": { $regex: countryValue, $options: "i" } },
      { "country.es": { $regex: countryValue, $options: "i" } },
    ],
  };

  const existingDestination = await destinationModel.findOne(query);
  if (existingDestination)
    return next(new AppError("Destination already exists", 409));

  const destination = await destinationModel.create(req.body);
  if (!destination)
    return next(new AppError("Failed to create destination", 500));

  res.status(201).json({
    status: "success",
    data: transformDestination(
      destination.toObject(),
      req.query.locale || "en"
    ),
  });
});

export const deleteDestination = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id))
    return next(new AppError("Invalid destination ID", 400));

  const destination = await destinationModel.findById(id);
  if (!destination) return next(new AppError("Destination not found", 404));

  const toursCount = await tourModel.countDocuments({ destination: id });
  if (toursCount > 0)
    return next(
      new AppError(
        `Cannot delete destination with ${toursCount} associated tours. Please delete tours first.`,
        400
      )
    );

  try {
    if (destination.mainImg?.public_id)
      removeImage(destination.mainImg.public_id);
    if (destination.images?.length) {
      destination.images.forEach((img) => {
        if (img?.public_id) removeImage(img.public_id);
      });
    }
  } catch (error) {
    console.error("Error cleaning up images:", error);
  }

  await destinationModel.findByIdAndDelete(id);
  res
    .status(200)
    .json({ status: "success", message: "Destination deleted successfully" });
});

export const updateDestination = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { locale = "en" } = req.query;
  if (!ObjectId.isValid(id))
    return next(new AppError("Invalid destination ID", 400));

  const destination = await destinationModel.findById(id);
  if (!destination) return next(new AppError("Destination not found", 404));

  try {
    if (req.body.mainImg && destination.mainImg?.public_id)
      removeImage(destination.mainImg.public_id);
    if (req.body.images && destination.images?.length) {
      destination.images.forEach((img) => {
        if (img?.public_id) removeImage(img.public_id);
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

  if (!updatedDestination)
    return next(new AppError("Failed to update destination", 500));

  res.status(200).json({
    status: "success",
    data: transformDestination(updatedDestination.toObject(), locale),
  });
});

export const getAllDestinations = catchAsyncError(async (req, res, next) => {
  const { locale = "en" } = req.query;

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

  if (!result?.length) return next(new AppError("No destinations found", 404));

  res.status(200).json({
    status: "success",
    data: {
      destinations:
        locale === "all" ? result : transformDestinations(result, locale),
      pagination: paginationMeta,
    },
  });
});

export const deleteAllDestinations = catchAsyncError(async (req, res, next) => {
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
    message: "Deleted Successfully.",
  });
});

export const getPopularDestinations = catchAsyncError(async (req, res) => {
  const { limit = 10, page = 1, locale = "en" } = req.query;

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
      destinations: transformDestinations(result, locale),
      pagination: paginationMeta,
    },
  });
});

export const getDestinationStats = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { locale = "en" } = req.query;

  if (!ObjectId.isValid(id))
    return next(new AppError("Invalid destination ID", 400));

  const destination = await destinationModel.findById(id).lean();
  if (!destination) return next(new AppError("Destination not found", 404));

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
        ratingDistribution: { $push: "$rating" },
      },
    },
  ]);

  const stats = {
    destination: transformDestination(destination, locale),
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

  await destinationModel.findByIdAndUpdate(id, {
    totalTours: stats.tours.totalTours,
    totalReviews: stats.reviews.totalReviews,
    averageRating: Math.round((stats.reviews.averageRating || 0) * 10) / 10,
  });

  res.status(200).json({ status: "success", data: { stats } });
});

export const getDestinationTours = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { locale = "en" } = req.query;

  if (!ObjectId.isValid(id)) {
    return next(new AppError("Invalid destination ID", 400));
  }

  const destination = await destinationModel.findById(id).lean();
  if (!destination) return next(new AppError("Destination not found", 404));

  const tours = await tourModel.find({
    destination: new mongoose.Types.ObjectId(id),
  });
  const transformedTours = transformTours(tours, locale);
  res.status(200).json({
    status: "success",
    data: {
      destination: transformDestination(destination, locale),
      tours: transformedTours,
    },
  });
});

export const searchDestinations = catchAsyncError(async (req, res) => {
  const {
    q,
    country: countryQuery,
    popular,
    limit = 10,
    page = 1,
    justCities = false,
    locale = "en",
  } = req.query;

  const searchQuery = {};

  if (q) {
    const baseOr = [
      { [`city.${locale}`]: { $regex: q, $options: "i" } },
      { [`country.${locale}`]: { $regex: q, $options: "i" } },
      { [`description.${locale}`]: { $regex: q, $options: "i" } },
    ];
    searchQuery.$or = baseOr;
  }

  if (countryQuery) {
    searchQuery[`country.${locale}`] = { $regex: countryQuery, $options: "i" };
  }

  if (popular === "true") searchQuery.popular = true;
  if (justCities === "true") searchQuery.city = { $exists: true };

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
      destinations: transformDestinations(result, locale),
      pagination: paginationMeta,
    },
  });
});

export const getDestinationsByCategory = catchAsyncError(
  async (req, res, next) => {
    const { category } = req.params;
    const { limit = 10, page = 1, locale = "en" } = req.query;

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
        destinations: transformDestinations(result, locale),
        pagination: paginationMeta,
        category,
      },
    });
  }
);

scheduleJob("0 2 * * *", async () => {
  await updatePopularDestinations();
});
