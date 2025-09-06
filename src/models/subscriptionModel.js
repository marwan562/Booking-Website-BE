import mongoose, { Schema, Types } from "mongoose";
import tourModel from "./tourModel.js";

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
      adults: { type: Number },
      price: { type: Number },
      totalPrice: { type: Number },
    },
    childrenPricing: {
      children: { type: Number },
      price: { type: Number },
      totalPrice: { type: Number },
    },
    options: [
      {
        name: { type: String },
        number: { type: Number },
        numberOfChildren: { type: Number },
        childPrice: { type: Number },
        price: { type: Number },
        totalPrice: { type: Number },
      },
    ],
    totalPrice: { type: Number, required: true },
    payment: { type: String, enum: ["pending", "success"], default: "pending" },
  },
  { timestamps: true }
);

schema.pre(/^find/, async function (next) {
  try {
    this.populate({
      path: "tourDetails",
      select: "mainImg title description",
    }).populate({
      path: "userDetails",
      select: "avatar name email nationality phone",
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
        select: "mainImg title description",
      },
      {
        path: "userDetails",
        select: "avatar name email nationality phone",
      },
    ]);
    next();
  } catch (error) {
    next(error); // Pass the error to the next middleware
  }
});

// After a booking is saved, increment totalTravelers in the tour
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
      next(err);
    }
  }
});

const subscriptionModel = mongoose.model("subscription", schema);

export default subscriptionModel;
