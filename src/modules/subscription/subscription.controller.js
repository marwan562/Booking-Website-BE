import subscriptionModel from "../../models/subscriptionModel.js";
import tourModel from "../../models/tourModel.js";
import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { AppError } from "../../utilities/AppError.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import { ObjectId } from "mongodb";
import schedule from "node-schedule";
import mongoose from "mongoose";

const createSubscription = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { id } = req.params;

  try {
    const tour = await tourModel.findById(id);
    if (!tour) {
      return res.status(404).json({ message: "Tour not found" });
    }

    let { adultPricing, childrenPricing, options } = req.body;
    req.body.userDetails = _id;
    req.body.tourDetails = id;

    let subtotalPrice = 0;
    let totalPrice = 0;
    let discountAmount = 0;
    let discountPercent = 0;

    if (adultPricing) {
      let fetchingAdult = await tourModel.aggregate([
        { $match: { _id: new ObjectId(id) } },
        { $unwind: "$adultPricing" },
        {
          $match: { "adultPricing._id": new ObjectId(adultPricing) },
        },
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
      let fetchingChildren = await tourModel.aggregate([
        { $match: { _id: new ObjectId(id) } },
        { $unwind: "$childrenPricing" },
        {
          $match: { "childrenPricing._id": new ObjectId(childrenPricing) },
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
      let fetchingOptions = await tourModel.aggregate([
        { $match: { _id: new ObjectId(id) } },
        { $unwind: "$options" },
        {
          $match: {
            "options._id": {
              $in: options.map((option) => new ObjectId(option.id)),
            },
          },
        },
        { $project: { options: 1 } },
        {
          $replaceRoot: { newRoot: "$options" },
        },
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

    res.status(200).json({
      message: "Subscription created successfully",
      data: subscriptionObj,
    });
  } catch (error) {
    console.error("Error in createSubscription:", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

const updateTourInCart = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const subscription = await subscriptionModel.findById(id);
  if (!subscription) {
    return next(new AppError("can't find subscription"));
  }

  await subscriptionModel.findByIdAndUpdate(id, req.body, { new: true });
  res.status(200).json({ message: "Subscription updated successfully" });
});

const getAllSubscription = catchAsyncError(async (req, res, next) => {
  const { role, _id } = req.user;
  if (role == "user") {
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

    if (!result) {
      return next(new AppError("can't find subscriptions"));
    }

    res.status(200).send({
      message: "success",
      data: { pagination: apiFeature.page, result },
    });
  }
  if (role == "admin") {
    // Normal query for result and pagination
    const apiFeature = new ApiFeature(
      subscriptionModel.find({}).populate("userDetails"),
      req.query
    )
      .paginate()
      .fields()
      .filter()
      .sort()
      .search()
      .lean();

    const result = await apiFeature.mongoseQuery;
    if (!result) {
      return next(new AppError("can't find subscriptions"));
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

      if (facet.totalRevenue.length > 0) {
        totalRevenue = facet.totalRevenue[0].total;
      }

      if (facet.successPayments.length > 0) {
        totalSuccessPayments = facet.successPayments[0].count;
      }

      if (facet.pendingPayments.length > 0) {
        totalPendingPayments = facet.pendingPayments[0].count;
      }
    }

    // Send full response
    res.status(200).send({
      message: "success",
      data: {
        result,
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

  const apiFeature = new ApiFeature(
    subscriptionModel
      .find({ userDetails: _id, payment: "pending" })
      .select("-payment -userDetails"),
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
    return next(new AppError("can't find subscriptions"));
  }
  res.status(200).send({ message: "success", data: result });
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
  const apiFeature = new ApiFeature(subscriptionModel.find({userDetails:id}), req.query)
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
  const { sortby } = req.query;

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

    return res.status(200).json({
      message: "Success",
      data: result,
    });
  }

  const bookings = await subscriptionModel
    .find({
      userDetails: _id,
      payment: "pending",
      passengers: { $exists: true, $not: { $size: 0 } },
    })
    .populate("tourDetails")
    .sort({ createdAt: -1 });

  if (!bookings || bookings.length === 0) {
    return next(
      new AppError(
        "No upcoming bookings with pending payment and passengers found.",
        404
      )
    );
  }

  res.status(200).send({
    message: "Success",
    data: bookings,
  });
});

const getSubscriptionsByRefs = async (req, res) => {
  try {
    const refsParam = req.query.refs;
    console.log(refsParam, "refsParam");

    if (!refsParam) {
      return res
        .status(400)
        .json({ error: "Missing bookingRefs query parameter" });
    }

    const refsArray = refsParam
      .split(",")
      .map((ref) => ref.trim())
      .filter(Boolean);

    if (refsArray.length === 0) {
      return res
        .status(400)
        .json({ error: "No valid booking references provided" });
    }

    const subscriptions = await subscriptionModel.find({
      bookingReference: { $in: refsArray },
    });

    return res.status(200).json({ subscriptions });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

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
