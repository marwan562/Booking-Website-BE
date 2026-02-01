import mongoose, { Schema, Types } from "mongoose";
import tourModel from "./tourModel.js";

const schema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "user", required: false },
    tour: { type: Types.ObjectId, ref: "tour", required: true },
    comment: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    images: [{ url: { type: String }, public_id: { type: String } }],
    // Fields for fake reviews (admin only)
    name: { type: String },
    avatar: { url: { type: String }, public_id: { type: String } },
    nationality: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for a unified user object
schema.virtual('userDetails').get(function () {
  if (this.user && typeof this.user === 'object') {
    return this.user;
  }
  return {
    name: this.name,
    avatar: this.avatar,
    nationality: this.nationality
  };
});

// Transform the output to ensure 'user' always contains valid data for the frontend
schema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    if (!ret.user || (typeof ret.user === 'object' && Object.keys(ret.user).length === 0)) {
      ret.user = {
        name: ret.name,
        avatar: ret.avatar,
        nationality: ret.nationality
      };
    }
    return ret;
  }
});

schema.pre("find", async function (next) {
  this.populate([
    { path: "user", select: "avatar name nationality" },
    // { path: "tour", select: "mainImg title description" },
  ]);
  next();
});

schema.pre("save", async function (next) {
  await this.populate([
    { path: "user", select: "avatar name nationality" },
    // { path: "tour", select: "mainImg title description destination" },
  ]);
  next();
});

schema.post("save", async function () {
  try {
    const tour = await tourModel.findByIdAndUpdate(
      this.tour,
      {
        $inc: {
          ratingSum: this.rating,
          totalReviews: 1,
        },
      },
      { new: true }
    );

    if (tour) {
      tour.averageRating = parseFloat(
        (tour.ratingSum / tour.totalReviews).toFixed(2)
      );
      await tour.save();
    }
  } catch (err) {
    console.error("Error updating destination ratings:", err);
  }
});

const reviewModel = mongoose.model("review", schema);

export default reviewModel;
