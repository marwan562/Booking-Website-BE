import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    city: { type: String },
    country: { type: String, required: true },
    mainImg: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    description: { type: String },
    popular: { type: Boolean, default: false },

    totalTravelers: { type: Number, default: 0 },
    totalTours: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("destination", schema);

// Add index to ensure uniqueness of city within country
schema.index({ country: 1, city: 1 }, { unique: true });

schema.index({ city: 1 });
schema.index({ country: 1 });


schema.pre("save", function (next) {
  this.country = this.country.trim().toLowerCase();
  this.city = this.city.trim().toLowerCase();
  next();
});
