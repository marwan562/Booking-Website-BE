import mongoose, { Schema, Types } from "mongoose";
const schema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "user", required: true },
    tour: { type: Types.ObjectId, ref: "tour", required: true },
    comment: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: true }
);

schema.pre(/^find/, async function (next) {
  this.populate([
    { path: "user", select: "avatar name" },
    { path: "tour", select: "mainImg title description" },
  ]);
  next();
});
schema.pre("save", async function (next) {
  await this.populate([
    { path: "user", select: "avatar name" },
    { path: "tour", select: "mainImg title description" },
  ]);
  next();
});
const reviewModel = mongoose.model("review", schema);

export default reviewModel;
