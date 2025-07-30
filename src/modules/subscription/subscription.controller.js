import subscriptionModel from "../../models/subscriptionModel.js";
import tourModel from "../../models/tourModel.js";
import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { AppError } from "../../utilities/AppError.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import { ObjectId } from "mongodb";
import schedule from "node-schedule";

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

    let totalPrice = 0;
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
        next(new AppError("can't find adultPricing"));
      }
      totalPrice = fetchingAdult[0].totalPrice;
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
      if (!childrenPricing[0]) {
        next(new AppError("can't find childrenPricing"));
      }
      req.body.childrenPricing = fetchingChildren[0];
      totalPrice += fetchingChildren[0].totalPrice;
    }
    if (options) {
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
      if (!fetchingOptions[0]) {
        next(new AppError("can't find options"));
      }
      fetchingOptions.forEach((option) => {
        options.forEach((inputOption) => {
          if (option._id.toString() === inputOption.id) {
            option.number = inputOption.number || 0;
            option.numberOfChildren = inputOption.numberOfChildren || 0;
      
            const adultTotal = option.price * option.number;
            const childTotal = option.childPrice * option.numberOfChildren;
      
            option.totalPrice = adultTotal + childTotal;
            totalPrice += option.totalPrice;
          }
        });
      });
      
      req.body.options = fetchingOptions;
    }

    req.body.totalPrice = totalPrice;

    const resultOfSubscription = new subscriptionModel(req.body);
    await resultOfSubscription.save();
    res.status(200).json({
      message: "Subscription created successfully",
      data: resultOfSubscription,
    });
  } catch (error) {
    // Handle errors here
    console.error("Error in createSubscription:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getAllSubscription = catchAsyncError(async (req, res, next) => {
  const { role, _id } = req.user;
  if (role == "user") {
    const apiFeature = new ApiFeature(
      subscriptionModel.find({ userDetails: _id }),
      req.query
    )
      .paginate()
      .fields()
      .filter()
      .sort()
      .search()
      .lean()

    const result = await apiFeature.mongoseQuery.exec();

    if (!result) {
      return next(new AppError("can't find subscriptions"));
    }

    res
      .status(200)
      .send({ message: "success", data: { page: apiFeature.page, result } });
  }
  if (role == "admin") {
    const apiFeature = new ApiFeature(subscriptionModel.find(), req.query)
      .paginate()
      .fields()
      .filter()
      .sort()
      .search()
      .lean()

    const result = await apiFeature.mongoseQuery
    if (!result) {
      return next(new AppError("can't find subscriptions"));
    }
    const totalCount = await apiFeature.getTotalCount();
    const paginationMeta = apiFeature.getPaginationMeta(totalCount);
    res.status(200).send({
      message: "success",
      data: { 
        subscriptions:result,
        pagination:paginationMeta
      },
    });
  }
});

const getSubscriptionById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const apiFeature = new ApiFeature(subscriptionModel.findById(id), req.query)
    .paginate()
    .fields()
    .filter()
    .sort()
    .search()
    .lean()

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
  deleteSubscription,
  createSubscription,
  getAllSubscription,
  clearSubscription,
  getSubscriptionById,
};
