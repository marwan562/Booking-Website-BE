import mongoose, { Schema, Types } from "mongoose";
import tourModel from "./tourModel.js";

const schema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "user", required: true },
    tour: { type: Types.ObjectId, ref: "tour", required: true },
    comment: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: true }
);

schema.pre("find", async function (next) {
  this.populate([
    { path: "user", select: "avatar name" },
    { path: "tour", select: "mainImg title description" },
  ]);
  next();
});

schema.pre("save", async function (next) {
  await this.populate([
    { path: "user", select: "avatar name" },
    { path: "tour", select: "mainImg title description destination" },
  ]);
  next();
});

schema.post("save", async function () {
  try {
    const tour = await await tourModel.findByIdAndUpdate(
      this.tour,
      {
        $inc: {
          ratingSum: this.rating,
          totalReviews: 1,
        },
      },
      { new: true }
    );

    tour.averageRating = parseFloat(
      (tour.ratingSum / tour.totalReviews).toFixed(2)
    );
    await tour.save();
  } catch (err) {
    console.error("Error updating destination ratings:", err);
  }
});

const reviewModel = mongoose.model("review", schema);

export default reviewModel;
