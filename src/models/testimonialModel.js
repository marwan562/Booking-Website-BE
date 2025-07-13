import mongoose, {  Schema } from "mongoose";
const schema = new Schema(
  {
    userName: { type: String, required: true },
    description: { type: String, required: true },
    rate: { type: Number, min: 1, max: 5, required: true },
    email: { type: String, required: true },
    avatar: {
      url: { type: String },
      public_id: { type: String }
    }
  },
  { timestamps: true }
);

const testimonialModel = mongoose.model("testimonial", schema);

export default testimonialModel;
