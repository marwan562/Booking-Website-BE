import subscriptionModel from "../../models/subscriptionModel.js";
import tourModel from "../../models/tourModel.js";
import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { AppError } from "../../utilities/AppError.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import schedule from "node-schedule";
import mongoose, { Types } from "mongoose";

const getLocalizedValue = (field, locale) => {
  if (!field || typeof field !== "object") return "";
  return field[locale] || field.en || "";
};

const transformTour = (tour, locale) => {
  if (!tour) return null;
  return {
    ...tour,
    title: getLocalizedValue(tour.title, locale),
    slug: getLocalizedValue(tour.slug, locale),
    description: getLocalizedValue(tour.description, locale),
    features: tour.features
      ? tour.features.map((f) => getLocalizedValue(f, locale))
      : [],
  };
};

const createSubscription = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { id } = req.params;
  const { locale = "en" } = req.query;
  const validLocales = ["en", "ar", "es"];
  if (!validLocales.includes(locale)) {
    return next(new AppError("Invalid locale. Use 'en', 'ar', or 'es'", 400));
  }

  if (!id || id.length !== 24) {
    return next(new AppError("Invalid tour ID", 400));
  }

  const tour = await tourModel.findById(id);
  if (!tour) {
    return next(new AppError("Tour not found", 404));
  }

  let { adultPricing, childrenPricing, options } = req.body;
  req.body.userDetails = _id;
  req.body.tourDetails = id;

  let subtotalPrice = 0;
  let totalPrice = 0;
  let discountAmount = 0;
  let discountPercent = 0;

  if (adultPricing) {
    const fetchingAdult = await tourModel.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      { $unwind: "$adultPricing" },
      { $match: { "adultPricing._id": new Types.ObjectId(adultPricing) } },
      { $project: { adultPricing: 1, _id: 0 } },
      { $replaceRoot: { newRoot: "$adultPricing" } },
    ]);

    if (!fetchingAdult[0]) {
      return next(new AppError("Can't find adultPricing", 404));
    }

    subtotalPrice += fetchingAdult[0].totalPrice;
    req.body.adultPricing = fetchingAdult[0];
  }

  if (childrenPricing) {
    const fetchingChildren = await tourModel.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      { $unwind: "$childrenPricing" },
      {
        $match: { "childrenPricing._id": new Types.ObjectId(childrenPricing) },
      },
      { $project: { childrenPricing: 1, _id: 0 } },
      { $replaceRoot: { newRoot: "$childrenPricing" } },
    ]);

    if (!fetchingChildren[0]) {
      return next(new AppError("Can't find childrenPricing", 404));
    }

    req.body.childrenPricing = fetchingChildren[0];
    subtotalPrice += fetchingChildren[0].totalPrice;
  }

  if (options && options.length > 0) {
    const fetchingOptions = await tourModel.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      { $unwind: "$options" },
      {
        $match: {
          "options._id": {
            $in: options.map((option) => new Types.ObjectId(option.id)),
          },
        },
      },
      { $project: { options: 1 } },
      { $replaceRoot: { newRoot: "$options" } },
    ]);

    if (!fetchingOptions || fetchingOptions.length === 0) {
      return next(new AppError("Can't find options", 404));
    }

    fetchingOptions.forEach((option) => {
      options.forEach((inputOption) => {
        if (option._id.toString() === inputOption.id) {
          option.number = inputOption.number || 0;
          option.numberOfChildren = inputOption.numberOfChildren || 0;

          const adultTotal = option.price * option.number;
          const childTotal = option.childPrice * option.numberOfChildren;

          option.totalPrice = adultTotal + childTotal;
          subtotalPrice += option.totalPrice;
        }
      });
    });

    req.body.options = fetchingOptions;
  }

  if (tour.hasOffer && tour.discountPercent && tour.discountPercent > 0) {
    discountPercent = tour.discountPercent;
    discountAmount = +((subtotalPrice * discountPercent) / 100).toFixed(2);
    totalPrice = +(subtotalPrice - discountAmount).toFixed(2);
  } else {
    totalPrice = subtotalPrice;
  }

  req.body.totalPrice = totalPrice;

  const resultOfSubscription = new subscriptionModel(req.body);
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
    data: subscriptionObj,
  });
});

function localizeDataByDestination(data, locale) {
  const getLocalizedValue = (obj, key, locale) => {
    return obj && obj[key] && obj[key][locale]
      ? obj[key][locale]
      : obj[key]?.en || "";
  };

  const localizedData = JSON.parse(JSON.stringify(data));

  localizedData.message = data.message;

  localizedData.data = data.map((item) => {
    const localizedItem = { ...item };

    localizedItem.destination = {
      ...item.destination,
      city: getLocalizedValue(item.destination, "city", locale),
      country: getLocalizedValue(item.destination, "country", locale),
      description: getLocalizedValue(item.destination, "description", locale),
    };

    localizedItem.bookings = item.bookings.map((booking) => {
      const localizedBooking = { ...booking };
      localizedBooking.tourDetails = {
        ...booking.tourDetails,
        title: getLocalizedValue(booking.tourDetails, "title", locale),
        features: booking.tourDetails.features.map((feature) =>
          getLocalizedValue({ feature }, "feature", locale)
        ),
      };
      return localizedBooking;
    });

    localizedItem.city = getLocalizedValue(item, "city", locale);
    localizedItem.country = getLocalizedValue(item, "country", locale);

    return localizedItem;
  });

  return localizedData;
}

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
            features: Array.isArray(localizedBooking.tourDetails.features)
              ? localizedBooking.tourDetails.features.map((feature) =>
                  getLocalizedValue({ feature }, "feature", locale)
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
                specialRequests: "$specialRequests",
                tourDetails: {
                  _id: "$tourDetails._id",
                  title: "$tourDetails.title",
                  slug: "$tourDetails.slug",
                  mainImg: "$tourDetails.mainImg",
                  features: "$tourDetails.features",
                  discountPercent: "$tourDetails.discountPercent",
                  hasOffer: "$tourDetails.hasOffer",
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
            "country.en": 1,
            "city.en": 1,
          },
        },
      ]);

      if (!result || result.length === 0) {
        return next(new AppError("No upcoming bookings found.", 404));
      }

      return res
        .status(200)
        .json(localizeData({ message: "Success", data: result }, locale));
    }

    const apiFeature = new ApiFeature(
      subscriptionModel.find({ userDetails: _id, payment: "success" }),
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
    const apiFeature = new ApiFeature(
      subscriptionModel.find().populate("userDetails"),
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

    const totalCount = await apiFeature.getTotalCount();
    const paginationMeta = apiFeature.getPaginationMeta(totalCount);

    const aggregationResult = await subscriptionModel.aggregate([
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

    let totalRevenue = 0;
    let totalSuccessPayments = 0;
    let totalPendingPayments = 0;

    if (aggregationResult.length) {
      const facet = aggregationResult[0];
      totalRevenue = facet.totalRevenue[0]?.total || 0;
      totalSuccessPayments = facet.successPayments[0]?.count || 0;
      totalPendingPayments = facet.pendingPayments[0]?.count || 0;
    }

    // const localizedResult = localizeData(
    //   { message: "Success", data: result },
    //   locale
    // );

    const transformedSubscriptions = result.map((booking) => ({
      ...booking,
      tourDetails: transformTour(booking.tourDetails, locale),
    }));

    res.status(200).send({
      message: "success",
      data: {
        result: transformedSubscriptions,
        pagination: paginationMeta,
        metrics: {
          totalRevenue,
          totalSuccessPayments,
          totalPendingPayments,
        },
      },
    });
  }
});

const getAllCart = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { locale = "en" } = req.query;

  const validLocales = ["en", "ar", "es"];
  if (!validLocales.includes(locale)) {
    return next(new AppError("Invalid locale. Use 'en', 'ar', or 'es'", 400));
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
              specialRequests: "$specialRequests",
              tourDetails: {
                _id: "$tourDetails._id",
                title: "$tourDetails.title",
                slug: "$tourDetails.slug",
                mainImg: "$tourDetails.mainImg",
                features: "$tourDetails.features",
                discountPercent: "$tourDetails.discountPercent",
                hasOffer: "$tourDetails.hasOffer",
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
      return next(new AppError("No upcoming bookings found.", 404));
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
  const { refs } = req.query;
  const { locale = "en" } = req.query;

  const validLocales = ["en", "ar", "es"];
  if (!validLocales.includes(locale)) {
    return next(new AppError("Invalid locale. Use 'en', 'ar', or 'es'", 400));
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
    .find({ bookingReference: { $in: refsArray } })
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
