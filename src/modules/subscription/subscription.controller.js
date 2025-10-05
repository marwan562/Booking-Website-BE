import subscriptionModel from "../../models/subscriptionModel.js";
import tourModel from "../../models/tourModel.js";
import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { AppError } from "../../utilities/AppError.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import schedule from "node-schedule";
import mongoose, { Types } from "mongoose";
import {
  getLocalizedValue,
  transformTour,
  isValidLocale,
  getSupportedLocales,
} from "../../utilities/localizationUtils.js";

const createSubscription = catchAsyncError(async (req, res, next) => {
  const { _id: userId } = req.user;
  const { id: tourId } = req.params;
  const { locale = "en" } = req.query;

  // Validate locale
  if (!isValidLocale(locale)) {
    return next(
      new AppError(
        `Invalid locale. Use one of: ${getSupportedLocales().join(", ")}`,
        400
      )
    );
  }

  // Validate tour ID
  if (!tourId || !Types.ObjectId.isValid(tourId)) {
    return next(new AppError("Invalid tour ID", 400));
  }

  const tour = await tourModel.findById(tourId).select("+coupons");
  if (!tour) {
    return next(new AppError("Tour not found", 404));
  }

  const {
    numberOfAdults = 0,
    numberOfChildren = 0,
    adultPricing: sentAdultPricing,
    childrenPricing: sentChildrenPricing,
    options = [],
    passengers = [],
    couponCode,
    time,
    date,
    day,
  } = req.body;

  if (numberOfAdults === 0 && numberOfChildren === 0) {
    return next(
      new AppError("At least one adult or child must be selected", 400)
    );
  }
  if (!time || !date) {
    return next(new AppError("Time and date are required", 400));
  }

  let subtotalPrice = 0;
  let totalPrice = 0;
  let discountAmount = 0;
  let discountPercent = tour.discountPercent || 0;
  let coupon = null;
  let parseCouponCode = couponCode ? JSON.parse(couponCode) : undefined;
  if (parseCouponCode) {
    const couponData = tour.coupons.find(
      (c) => c.code.toUpperCase() === parseCouponCode.code.toUpperCase()
    );

    if (!couponData) {
      return next(new AppError("Invalid or expired coupon code", 400));
    }

    if (!couponData.isActive) {
      return next(new AppError("Coupon is not active", 400));
    }

    const currentDate = new Date();
    if (
      (couponData.validFrom && couponData.validFrom > currentDate) ||
      (couponData.validTo && couponData.validTo < currentDate)
    ) {
      return next(new AppError("Invalid or expired coupon code", 400));
    }

    // Coupon discount overrides tour discount
    coupon = {
      code: couponData.code,
      discountPercent: couponData.discountPercent,
    };
    discountPercent = couponData.discountPercent;
  }

  // Calculate adult pricing
  let adultTotal = 0;
  let adultUnitPrice = tour.price || 0;
  let selectedAdultPricing = null;

  if (numberOfAdults > 0) {
    selectedAdultPricing = tour.adultPricing.find(
      (p) => p.adults === Number(numberOfAdults)
    );

    if (selectedAdultPricing) {
      adultUnitPrice = selectedAdultPricing.price;
    } else {
      const highestPricing = tour.adultPricing.reduce(
        (max, p) => (p.adults > (max?.adults || 0) ? p : max),
        null
      );

      if (highestPricing) {
        adultUnitPrice = highestPricing.price;
      } else {
        adultUnitPrice = tour.price || 0;
      }
    }

    adultTotal = adultUnitPrice * Number(numberOfAdults);
    selectedAdultPricing = {
      adults: Number(numberOfAdults),
      price: adultUnitPrice,
      totalPrice: adultTotal,
      _id: selectedAdultPricing?._id || null,
    };

    subtotalPrice += adultTotal;
  }

  // Calculate children pricing
  let childTotal = 0;
  let childUnitPrice = tour.childPrice || 0;
  let selectedChildPricing = null;

  if (numberOfChildren > 0) {
    selectedChildPricing = tour.childrenPricing.find(
      (p) => p.children === Number(numberOfChildren)
    );

    if (selectedChildPricing) {
      childUnitPrice = selectedChildPricing.price;
    } else {
      const highestPricing = tour.childrenPricing.reduce(
        (max, p) => (p.children > (max?.children || 0) ? p : max),
        null
      );

      if (highestPricing) {
        childUnitPrice = highestPricing.price;
      } else {
        childUnitPrice = 0;
      }
    }

    childTotal = childUnitPrice * Number(numberOfChildren);
    selectedChildPricing = {
      children: Number(numberOfChildren),
      price: childUnitPrice,
      totalPrice: childTotal,
      _id: selectedChildPricing?._id || null,
    };

    subtotalPrice += childTotal;
  }

  // Calculate options pricing
  let selectedOptions = [];
  if (Array.isArray(options) && options.length > 0) {
    const optionIds = options
      .filter((opt) => Types.ObjectId.isValid(opt.id))
      .map((opt) => new Types.ObjectId(opt.id));

    if (optionIds.length === 0) {
      return next(new AppError("Invalid option IDs provided", 400));
    }

    const fetchingOptions = await tourModel
      .findOne({
        _id: new Types.ObjectId(tourId),
        "options._id": { $in: optionIds },
      })
      .select("options")
      .lean();

    if (
      !fetchingOptions ||
      !fetchingOptions.options ||
      fetchingOptions.options.length === 0
    ) {
      return next(new AppError("Selected options not found", 404));
    }

    selectedOptions = fetchingOptions.options
      .filter((opt) => optionIds.some((id) => id.equals(opt._id)))
      .map((option) => {
        const clientOption = options.find(
          (o) => o.id === option._id.toString()
        );
        const number = clientOption?.number || 0;
        const numberOfChildren = clientOption?.numberOfChildren || 0;

        const adultOptionTotal = (option.price || 0) * number;
        const childOptionTotal = (option.childPrice || 0) * numberOfChildren;
        const optionTotalPrice = adultOptionTotal + childOptionTotal;

        subtotalPrice += optionTotalPrice;

        return {
          _id: option._id,
          name: option.name[locale] || option.name.en,
          number,
          numberOfChildren,
          price: option.price || 0,
          childPrice: option.childPrice || 0,
          adultTotal: adultOptionTotal,
          childTotal: childOptionTotal,
          totalPrice: optionTotalPrice,
        };
      });
  }

  // NOW calculate discount and total price (AFTER subtotalPrice is calculated)
  if (discountPercent > 0) {
    discountPercent = Math.min(discountPercent, 100);
    discountAmount = (subtotalPrice * discountPercent) / 100;
    totalPrice = subtotalPrice - discountAmount;
  } else {
    totalPrice = subtotalPrice;
  }

  // Round to 2 decimal places
  discountAmount = Number(discountAmount.toFixed(2));
  totalPrice = Number(totalPrice.toFixed(2));
  subtotalPrice = Number(subtotalPrice.toFixed(2));

  const subscriptionData = {
    userDetails: userId,
    tourDetails: tourId,
    numberOfAdults: Number(numberOfAdults),
    numberOfChildren: Number(numberOfChildren),
    adultPricing: selectedAdultPricing,
    childrenPricing: selectedChildPricing,
    options: selectedOptions,
    passengers,
    time,
    date,
    totalPrice: Number(totalPrice),
    discount: discountPercent,
    coupon: coupon
      ? { code: coupon.code, discountPercent: coupon.discountPercent }
      : undefined,
    mainImg: tour.mainImg,
    title: tour.title,
    day,
    discountPercent,
  };

  const resultOfSubscription = new subscriptionModel(subscriptionData);
  await resultOfSubscription.save();

  const subscriptionObj = resultOfSubscription.toObject();
  delete subscriptionObj.payment;
  delete subscriptionObj.userDetails;
  subscriptionObj.tourDetails = transformTour(
    subscriptionObj.tourDetails,
    locale
  );

  res.status(200).json({
    status: "success",
    message: "Subscription created successfully",
    data: {
      ...subscriptionObj,
      coupon: coupon
        ? { code: coupon.code, discountPercent: coupon.discountPercent }
        : undefined,
      discount: discountPercent,
    },
  });
});

export default createSubscription;

const updateTourInCart = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const subscription = await subscriptionModel.findById(id);
  if (!subscription) {
    return next(new AppError("can't find subscription"));
  }

  await subscriptionModel.findByIdAndUpdate(id, req.body, { new: true });
  res.status(200).json({ message: "Subscription updated successfully" });
});

function localizeData(data, locale = "en") {
  const getLocalizedValue = (obj, key, locale) => {
    if (!obj || !obj[key]) return "";
    return obj[key][locale] || obj[key].en || Object.values(obj[key])[0] || "";
  };

  if (!data || !Array.isArray(data.data)) {
    return { message: data?.message || "Success", data: [] };
  }

  const localizedData = JSON.parse(JSON.stringify(data));

  localizedData.data = localizedData.data.map((item) => {
    const localizedItem = { ...item };

    if (localizedItem.destination) {
      localizedItem.destination = {
        ...localizedItem.destination,
        city: getLocalizedValue(localizedItem.destination, "city", locale),
        country: getLocalizedValue(
          localizedItem.destination,
          "country",
          locale
        ),
        description: getLocalizedValue(
          localizedItem.destination,
          "description",
          locale
        ),
        slug: {
          city: getLocalizedValue(
            localizedItem.destination.slug,
            "city",
            locale
          ),
          country: getLocalizedValue(
            localizedItem.destination.slug,
            "country",
            locale
          ),
        },
      };
    }

    if (localizedItem.bookings && Array.isArray(localizedItem.bookings)) {
      localizedItem.bookings = localizedItem.bookings.map((booking) => {
        const localizedBooking = { ...booking };
        if (localizedBooking.tourDetails) {
          localizedBooking.tourDetails = {
            ...localizedBooking.tourDetails,
            title: getLocalizedValue(
              localizedBooking.tourDetails,
              "title",
              locale
            ),
            slug: getLocalizedValue(
              localizedBooking.tourDetails,
              "slug",
              locale
            ),
            location: {
              to: getLocalizedValue(
                localizedBooking.tourDetails.location,
                "to",
                locale
              ),
            },
            features: Array.isArray(localizedBooking.tourDetails.features)
              ? localizedBooking.tourDetails.features.map((feature) =>
                  getLocalizedValue({ feature }, "feature", locale)
                )
              : [],
            includes: Array.isArray(localizedBooking.tourDetails.includes)
              ? localizedBooking.tourDetails.includes.map((include) =>
                  getLocalizedValue({ include }, "include", locale)
                )
              : [],
            notIncludes: Array.isArray(localizedBooking.tourDetails.notIncludes)
              ? localizedBooking.tourDetails.notIncludes.map((notInclude) =>
                  getLocalizedValue({ notInclude }, "notInclude", locale)
                )
              : [],
          };
        }
        return localizedBooking;
      });
    }
    localizedItem.city = getLocalizedValue(localizedItem, "city", locale);
    localizedItem.country = getLocalizedValue(localizedItem, "country", locale);

    return localizedItem;
  });

  return localizedData;
}
const getAllSubscription = catchAsyncError(async (req, res, next) => {
  const { sortby, locale = "en" } = req.query;
  const { role, _id } = req.user;

  if (role === "user") {
    if (sortby === "by-destination") {
      const result = await subscriptionModel.aggregate([
        {
          $match: {
            userDetails: new mongoose.Types.ObjectId(_id),
            payment: "success",
            passengers: { $exists: true, $not: { $size: 0 } },
          },
        },
        {
          $lookup: {
            from: "tours",
            localField: "tourDetails",
            foreignField: "_id",
            as: "tourDetails",
          },
        },
        { $unwind: "$tourDetails" },
        {
          $lookup: {
            from: "destinations",
            localField: "tourDetails.destination",
            foreignField: "_id",
            as: "destination",
          },
        },
        { $unwind: "$destination" },
        {
          $group: {
            _id: {
              country: `$destination.country`,
              city: `$destination.city`,
            },
            destination: { $first: "$destination" },
            bookings: {
              $push: {
                _id: "$_id",
                bookingReference: "$bookingReference",
                date: "$date",
                time: "$time",
                day: "$day",
                passengers: "$passengers",
                adultPricing: "$adultPricing",
                childrenPricing: "$childrenPricing",
                totalPrice: "$totalPrice",
                options: "$options",
                payment: "$payment",
                coupon: "$coupon",
                specialRequests: "$specialRequests",
                tourDetails: {
                  _id: "$tourDetails._id",
                  title: "$tourDetails.title",
                  slug: "$tourDetails.slug",
                  mainImg: "$tourDetails.mainImg",
                  features: "$tourDetails.features",
                  includes: "$tourDetails.includes",
                  notIncludes: "$tourDetails.notIncludes",
                  discountPercent: "$tourDetails.discountPercent",
                  hasOffer: "$tourDetails.hasOffer",
                  totalReviews: "$tourDetails.totalReviews",
                  location: "$tourDetails.location",
                  averageRating: "$tourDetails.averageRating",
                  price: "$tourDetails.price",
                  duration: "$tourDetails.duration",
                  date: "$tourDetails.date",
                },
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            country: "$_id.country",
            city: "$_id.city",
            destination: 1,
            bookings: 1,
          },
        },
        {
          $sort: {
            "_id.country": 1,
            "_id.city": 1,
          },
        },
      ]);

      if (!result || result.length === 0) {
        return next(new AppError("No bookings by destination found.", 404));
      }
      return res
        .status(200)
        .json(localizeData({ message: "Success", data: result }, locale));
    }

    const apiFeature = new ApiFeature(
      subscriptionModel
        .find({ userDetails: _id, payment: "success" })
        .populate({
          path: "tourDetails",
          select:
            "mainImg slug title totalReviews features averageRating hasOffer location discountPercent includes notIncludes",
        }),
      req.query
    )
      .paginate()
      .fields()
      .filter()
      .sort()
      .search()
      .lean();

    const result = await apiFeature.mongoseQuery.exec();

    if (!result || result.length === 0) {
      return next(new AppError("No subscriptions found.", 404));
    }

    const transformedSubscriptions = result.map((booking) => ({
      ...booking,
      tourDetails: transformTour(booking.tourDetails, locale),
    }));

    res.status(200).send({
      message: "success",
      data: {
        pagination: apiFeature.page,
        result: transformedSubscriptions,
      },
    });
  }
  if (role === "admin") {
    const matchConditions = {};

    if (req.query.startDate || req.query.endDate) {
      matchConditions.createdAt = {};

      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate);
        if (isNaN(startDate.getTime())) {
          return next(new AppError("Invalid startDate format.", 400));
        }
        matchConditions.createdAt.$gte = startDate;
      }

      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        if (isNaN(endDate.getTime())) {
          return next(new AppError("Invalid endDate format.", 400));
        }
        matchConditions.createdAt.$lte = endDate;
      }

      if (
        req.query.startDate &&
        req.query.endDate &&
        new Date(req.query.startDate) > new Date(req.query.endDate)
      ) {
        return next(new AppError("startDate cannot be after endDate.", 400));
      }
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "users",
          localField: "userDetails",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "tours",
          localField: "tourDetails",
          foreignField: "_id",
          as: "tourDetails",
        },
      },
      {
        $unwind: {
          path: "$tourDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (req.query.keyword) {
      pipeline.unshift({
        $match: {
          $or: [
            { bookingReference: { $regex: req.query.keyword, $options: "i" } },
            {
              "userDetails.name": { $regex: req.query.keyword, $options: "i" },
            },
            {
              "userDetails.email": { $regex: req.query.keyword, $options: "i" },
            },
          ],
        },
      });
    }

    if (req.query.payment && req.query.payment !== "all") {
      pipeline.push({
        $match: { payment: req.query.payment },
      });
    }

    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await subscriptionModel.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    pipeline.push({ $skip: skip }, { $limit: limit });

    const result = await subscriptionModel.aggregate(pipeline);

    const totalPages = Math.ceil(totalCount / limit);
    const paginationMeta = {
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalCount,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    const metricsAgg = await subscriptionModel.aggregate([
      { $match: matchConditions },
      {
        $facet: {
          totalRevenue: [
            { $match: { payment: "success" } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } },
          ],
          successPayments: [
            { $match: { payment: "success" } },
            { $count: "count" },
          ],
          pendingPayments: [
            { $match: { payment: "pending" } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const metrics = {
      totalRevenue: metricsAgg[0]?.totalRevenue[0]?.total || 0,
      totalSuccessPayments: metricsAgg[0]?.successPayments[0]?.count || 0,
      totalPendingPayments: metricsAgg[0]?.pendingPayments[0]?.count || 0,
    };

    const transformedSubscriptions = result.map((booking) => ({
      ...booking,
      tourDetails: transformTour(booking.tourDetails, locale),
    }));

    res.status(200).send({
      message: "success",
      data: {
        result: transformedSubscriptions,
        pagination: paginationMeta,
        metrics: metrics,
      },
    });
  }
});

const getAllCart = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { locale = "en" } = req.query;

  const validLocales = ["en", "es", "fr"];
  if (!validLocales.includes(locale)) {
    return next(new AppError("Invalid locale. Use 'en', 'es', or 'fr'", 400));
  }

  // Use ApiFeature to build the query
  const apiFeature = new ApiFeature(
    subscriptionModel
      .find({ userDetails: _id, payment: "pending" })
      .select("-payment -userDetails")
      .populate({
        path: "tourDetails",
        select:
          "mainImg slug title totalReviews features averageRating hasOffer discountPercent",
      }),
    req.query
  )
    .paginate()
    .fields()
    .filter()
    .sort()
    .search()
    .lean();

  const subscriptions = await apiFeature.mongoseQuery;

  if (!subscriptions || subscriptions.length === 0) {
    return next(new AppError("No pending subscriptions found in cart", 404));
  }

  const transformedSubscriptions = subscriptions.map((subscription) => ({
    ...subscription,
    tourDetails: transformTour(subscription.tourDetails, locale),
  }));

  const paginationMeta = apiFeature.getPaginationMeta(
    await subscriptionModel.countDocuments({
      userDetails: _id,
      payment: "pending",
    })
  );

  res.status(200).json({
    status: "success",
    data: transformedSubscriptions,
    pagination: paginationMeta,
  });
});

const deleteTourFromCart = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const result = await subscriptionModel.findByIdAndDelete(id).populate({
    path: "userDetails",
  });
  if (!result) {
    return next(new AppError("can't find subscription"));
  }
  res.status(200).send({ message: "success", data: result });
});

const deleteAllToursInCart = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const result = await subscriptionModel.deleteMany({
    userDetails: _id,
    payment: "pending",
  });
  if (!result) {
    return next(new AppError("can't find subscription"));
  }
  res.status(200).send({ message: "success", data: result });
});

const getSubscriptionById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const apiFeature = new ApiFeature(
    subscriptionModel.find({ userDetails: id }),
    req.query
  )
    .paginate()
    .fields()
    .filter()
    .sort()
    .search()
    .lean();

  const result = await apiFeature.mongoseQuery.lean();
  if (!result) {
    return next(new AppError("can't find subscription"));
  }
  res.status(200).send({ message: "success", data: result });
});

const deleteSubscription = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const subscription = await subscriptionModel.findById(id);
  if (!subscription) {
    return next(new AppError("Subscription not found", 404));
  }

  await subscriptionModel.findByIdAndDelete(id);
  res.status(200).json({ message: "Subscription deleted successfully" });
});

/**
 * data: {
    tourId: string;
    passengers: {
        name: string;
        lastName: string;
        dateOfBirth: string;
        nationality: string;
        passport?: string | undefined;
    }[];
}[]
 */

const updateToursWithPersonalDetails = catchAsyncError(
  async (req, res, next) => {
    const { _id } = req.user;
    const { tours } = req.body;

    const subscriptions = await subscriptionModel
      .find({
        userDetails: _id,
        payment: "pending",
      })
      .select("-payment -userDetails");

    if (!subscriptions || subscriptions.length === 0) {
      return next(new AppError("Can't find any pending subscriptions", 404));
    }

    for (const tour of tours) {
      for (const sub of subscriptions) {
        if (String(sub._id) === String(tour.tourId)) {
          sub.passengers = tour.passengers;
          await sub.save();
        }
      }
    }

    res.status(200).send({
      message: "Success",
      data: subscriptions,
    });
  }
);
const upcomingBookings = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { sortby, locale = "en" } = req.query;

  if (sortby === "by-destination") {
    const result = await subscriptionModel.aggregate([
      {
        $match: {
          userDetails: new mongoose.Types.ObjectId(_id),
          payment: "pending",
          passengers: { $exists: true, $not: { $size: 0 } },
        },
      },
      {
        $lookup: {
          from: "tours",
          localField: "tourDetails",
          foreignField: "_id",
          as: "tourDetails",
        },
      },
      { $unwind: "$tourDetails" },
      {
        $lookup: {
          from: "destinations",
          localField: "tourDetails.destination",
          foreignField: "_id",
          as: "destination",
        },
      },
      { $unwind: "$destination" },
      {
        $group: {
          _id: {
            country: "$destination.country",
            city: "$destination.city",
          },
          destination: { $first: "$destination" },
          bookings: {
            $push: {
              _id: "$_id",
              bookingReference: "$bookingReference",
              date: "$date",
              time: "$time",
              day: "$day",
              passengers: "$passengers",
              adultPricing: "$adultPricing",
              childrenPricing: "$childrenPricing",
              totalPrice: "$totalPrice",
              options: "$options",
              payment: "$payment",
              coupon: "$coupon",
              specialRequests: "$specialRequests",
              tourDetails: {
                _id: "$tourDetails._id",
                title: "$tourDetails.title",
                slug: "$tourDetails.slug",
                mainImg: "$tourDetails.mainImg",
                features: "$tourDetails.features",
                discountPercent: "$tourDetails.discountPercent",
                hasOffer: "$tourDetails.hasOffer",
                location: "$tourDetails.location",
                totalReviews: "$tourDetails.totalReviews",
                averageRating: "$tourDetails.averageRating",
                price: "$tourDetails.price",
                duration: "$tourDetails.duration",
                date: "$tourDetails.date",
              },
              createdAt: "$createdAt",
              updatedAt: "$updatedAt",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          country: "$_id.country",
          city: "$_id.city",
          destination: 1,
          bookings: 1,
        },
      },
      {
        $sort: {
          country: 1,
          city: 1,
        },
      },
    ]);

    if (!result || result.length === 0) {
      return next(new AppError("No Bookings by destination found.", 404));
    }
    return res
      .status(200)
      .json(localizeData({ message: "Success", data: result }, locale));
  }

  const bookings = await subscriptionModel
    .find({
      userDetails: _id,
      payment: "pending",
      passengers: { $exists: true, $not: { $size: 0 } },
    })
    .populate("tourDetails")
    .sort({ createdAt: -1 })
    .lean();

  if (!bookings || bookings.length === 0) {
    return next(
      new AppError(
        "No upcoming bookings with pending payment and passengers found.",
        404
      )
    );
  }
  const transformedSubscriptions = bookings.map((booking) => ({
    ...booking,
    tourDetails: transformTourByRefs(booking.tourDetails, locale),
  }));

  res.status(200).send({
    message: "Success",
    data: transformedSubscriptions,
  });
});

const transformTourByRefs = (tour, locale) => {
  if (!tour) return null;
  return {
    ...tour,
    title: getLocalizedValue(tour.title, locale),
    slug: getLocalizedValue(tour.slug, locale),
    description: getLocalizedValue(tour.description, locale),
    features: tour.features
      ? tour.features.map((f) => getLocalizedValue(f, locale))
      : [],
    includes: tour.includes
      ? tour.includes.map((i) => getLocalizedValue(i, locale))
      : [],
    notIncludes: tour.notIncludes
      ? tour.notIncludes.map((ni) => getLocalizedValue(ni, locale))
      : [],
    options: tour.options
      ? tour.options.map((opt) => ({
          ...opt,
          name: getLocalizedValue(opt.name, locale),
        }))
      : [],
    category: getLocalizedValue(tour.category, locale),
    tags: tour.tags ? tour.tags.map((t) => getLocalizedValue(t, locale)) : [],
    location: tour.location
      ? {
          from: getLocalizedValue(tour.location.from, locale),
          to: getLocalizedValue(tour.location.to, locale),
        }
      : { from: "", to: "" },
    itinerary: tour.itinerary
      ? tour.itinerary.map((item) => ({
          ...item,
          title: getLocalizedValue(item.title, locale),
          subtitle: getLocalizedValue(item.subtitle, locale),
        }))
      : [],
    historyBrief: getLocalizedValue(tour.historyBrief, locale),
  };
};

const getSubscriptionsByRefs = catchAsyncError(async (req, res, next) => {
  const { _id: userId } = req.user;
  const { refs } = req.query;
  const { locale = "en" } = req.query;

  const validLocales = ["en", "es", "fr"];
  if (!validLocales.includes(locale)) {
    return next(new AppError("Invalid locale. Use 'en', 'es', or 'fr'", 400));
  }

  if (!refs) {
    return next(new AppError("Missing bookingRefs query parameter", 400));
  }

  const refsArray = refs
    .split(",")
    .map((ref) => ref.trim())
    .filter(Boolean);

  if (refsArray.length === 0) {
    return next(new AppError("No valid booking references provided", 400));
  }

  const subscriptions = await subscriptionModel
    .find({ bookingReference: { $in: refsArray }, userDetails: userId })
    .lean();

  if (!subscriptions || subscriptions.length === 0) {
    return next(
      new AppError("No subscriptions found for the provided references", 404)
    );
  }

  const transformedSubscriptions = subscriptions.map((subscription) => ({
    ...subscription,
    tourDetails: transformTourByRefs(subscription.tourDetails, locale),
  }));

  res.status(200).json({
    status: "success",
    data: transformedSubscriptions,
  });
});

const clearSubscription = catchAsyncError(async (req, res, next) => {
  const subscriptions = await subscriptionModel.find({ payment: "pending" });
  const now = new Date();
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  const inValidSubscription = subscriptions.filter(
    (subscription) => now - subscription.createdAt > oneDayInMilliseconds
  );
  await Promise.all(
    inValidSubscription.map(async (sub) => {
      await subscriptionModel.findByIdAndDelete(sub._id);
    })
  );
});

schedule.scheduleJob("0 0 * * *", function () {
  clearSubscription(null, null, null);
});

export {
  getSubscriptionsByRefs,
  upcomingBookings,
  updateTourInCart,
  getAllCart,
  deleteAllToursInCart,
  deleteTourFromCart,
  deleteSubscription,
  createSubscription,
  getAllSubscription,
  clearSubscription,
  getSubscriptionById,
  updateToursWithPersonalDetails,
};
