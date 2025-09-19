import mongoose, { Schema } from "mongoose";

const localizedSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, required: true },
    es: { type: String, required: true },
    fr: { type: String, required: true },
  },
  { _id: false }
);

const schema = new Schema(
  {
    city: { type: localizedSchema, required: true },
    country: { type: localizedSchema, required: true },

    mainImg: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },

    description: { type: localizedSchema },
    popular: { type: Boolean, default: false },
    totalTravelers: { type: Number, default: 0 },
    totalTours: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

schema.index({ country: 1, "city.en": 1 }, { unique: true });

schema.index({ "city.en": 1 });
schema.index({ country: 1 });

schema.pre("save", function (next) {
  if (this.country) {
    if (this.country.en) this.country.en = this.country.en.trim().toLowerCase();
    if (this.country.ar) this.country.ar = this.country.ar.trim();
    if (this.country.es) this.country.es = this.country.es.trim().toLowerCase();
  }

  if (this.city) {
    if (this.city.en) this.city.en = this.city.en.trim().toLowerCase();
    if (this.city.ar) this.city.ar = this.city.ar.trim()
    if (this.city.es) this.city.es = this.city.es.trim().toLowerCase();
  }

  next();
});

export default mongoose.model("destination", schema);