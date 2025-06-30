import mongoose, { Schema, Types } from "mongoose";

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
    next(error); // Pass the error to the next middleware
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

const subscriptionModel = mongoose.model("subscription", schema);

export default subscriptionModel;
