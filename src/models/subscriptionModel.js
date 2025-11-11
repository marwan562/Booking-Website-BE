import mongoose, { Schema, Types } from "mongoose";
import tourModel from "./tourModel.js";

const passengerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nationality: { type: String, required: true },
});

const schema = new Schema(
  {
    tourDetails: { type: Types.ObjectId, required: true, ref: "tour" },
    userDetails: { type: Types.ObjectId, required: true, ref: "user" },
    time: { type: String, required: true },
    date: { type: String, required: true },
    day: {
      type: String,
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    adultPricing: {
      adults: { type: Number, default: 0 },
      price: { type: Number, default: 0 },
      totalPrice: { type: Number, default: 0 },
    },
    childrenPricing: {
      children: { type: Number, default: 0 },
      price: { type: Number, default: 0 },
      totalPrice: { type: Number, default: 0 },
    },
    options: [
      {
        name: { type: String },
        number: { type: Number, default: 0 },
        numberOfChildren: { type: Number, default: 0 },
        childPrice: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
        totalPrice: { type: Number, default: 0 },
      },
    ],
    passengers: [passengerSchema],
    totalPrice: { type: Number, required: true },
    payment: {
      type: String,
      enum: ["pending", "success", "refunded"],
      default: "pending",
    },
    paymentIntentId: { type: String, unique: true, select: false },
    chargeId: { type: String },
    specialRequests: { type: String },
    coupon: {
      code: { type: String },
      discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    },
    refundDetails: {
      refundedAt: { type: Date },
      refundAmount: { type: Number },
      originalAmount: { type: Number },
      refundPercentage: { type: Number },
      deductionAmount: { type: Number },
      daysBeforeBooking: { type: Number },
      appliedPolicy: {
        daysBefore: { type: Number },
        discountPercent: { type: Number },
      },
      refundId: { type: String },
    },
    bookingReference: {
      type: String,
      unique: true,
      default: function () {
        return (
          "BK" +
          Date.now() +
          Math.random().toString(36).substr(2, 5).toUpperCase()
        );
      },
    },
  },
  {
    timestamps: true,
    indexes: [
      { bookingReference: 1 },
      { userDetails: 1, createdAt: -1 },
      { payment: 1 },
    ],
  }
);

schema.methods.getFormattedReference = function () {
  return this.bookingReference;
};

schema.methods.getTotalPassengers = function () {
  return this.passengers?.length || 0;
};

schema.methods.getRefundInfo = function () {
  if (this.payment !== "refunded" || !this.refundDetails) {
    return null;
  }

  return {
    refundedAt: this.refundDetails.refundedAt,
    refundAmount: this.refundDetails.refundAmount,
    originalAmount: this.refundDetails.originalAmount,
    deductionAmount: this.refundDetails.deductionAmount,
    refundPercentage: this.refundDetails.refundPercentage,
    daysBeforeBooking: this.refundDetails.daysBeforeBooking,
    appliedPolicy: this.refundDetails.appliedPolicy,
    refundId: this.refundDetails.refundId,
  };
};

schema.methods.isRefundable = function (tourRefundPolicy) {
  if (this.payment !== "success") {
    return { eligible: false };
  }

  const bookingDateTime = new Date(`${this.date} ${this.time}`);
  const now = new Date();

  if (bookingDateTime < now) {
    return { eligible: false, };
  }

  const daysUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60 * 24);

  const refundPolicy = tourRefundPolicy || [
    { daysBefore: 4, discountPercent: 0 },
  ];
  const sortedPolicy = [...refundPolicy].sort(
    (a, b) => b.daysBefore - a.daysBefore
  );

  let applicablePolicy = null;
  for (const policy of sortedPolicy) {
    if (daysUntilBooking >= policy.daysBefore) {
      applicablePolicy = policy;
      break;
    }
  }

  if (!applicablePolicy) {
    return {
      eligible: false,
      daysRemaining: Math.round(daysUntilBooking * 10) / 10,
    };
  }

  const refundPercentage = 100 - applicablePolicy.discountPercent;
  const refundAmount = Math.round((this.totalPrice * refundPercentage) / 100);

  return {
    eligible: true,
    applicablePolicy,
    refundAmount,
    refundPercentage,
    deductionAmount: this.totalPrice - refundAmount,
    daysUntilBooking: Math.round(daysUntilBooking * 10) / 10,
  };
};

schema.statics.findByReference = function (reference) {
  return this.findOne({ bookingReference: reference });
};

schema.pre(/^find/, async function (next) {
  try {
    this.populate({
      path: "tourDetails",
      select:
        "mainImg slug title totalReviews features averageRating hasOffer location discountPercent includes notIncludes",
    });
    next();
  } catch (error) {
    next(error);
  }
});

schema.pre("save", async function (next) {
  try {
    await this.populate([
      {
        path: "tourDetails",
        select:
          "mainImg slug title totalReviews features averageRating hasOffer location discountPercent includes notIncludes",
      },
      {
        path: "userDetails",
        select: "avatar name email nationality phone",
      },
    ]);
    next();
  } catch (error) {
    next(error);
  }
});

schema.post("save", async function () {
  if (this.payment === "success") {
    try {
      const adults = this.adultPricing?.adults || 0;
      const children = this.childrenPricing?.children || 0;

      const optionsTotal =
        this.options?.reduce((sum, opt) => {
          return sum + (opt.number || 0) + (opt.numberOfChildren || 0);
        }, 0) || 0;

      const totalTravelers = adults + children + optionsTotal;

      await tourModel.findByIdAndUpdate(this.tourDetails, {
        $inc: { totalTravelers },
      });
    } catch (err) {
      console.error("Error updating totalTravelers:", err);
    }
  }
});

const subscriptionModel = mongoose.model("subscription", schema);

export default subscriptionModel;