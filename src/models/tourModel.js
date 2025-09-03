import mongoose, { Schema } from "mongoose";
import slugify from "slugify";

const schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  description: { type: String, required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: "destination", required: true },
  mainImg: {
    type: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    required: true,
  },
  images: [
    {
      url: { type: String },
      public_id: { type: String },
    },
  ],
  index: { type: Number, default: -1 },

  options: [
    {
      name: { type: String },
      price: { type: Number },
      childPrice: {
        type: Number,
        default: function () {
          return this.price * 0.5;
        },
      },
    },
  ],
  isRepeated: { type: Boolean, default: true },
  repeatTime: [{ type: String }],
  repeatDays: [
    {
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
  ],
  category: { type: String, required: true },
  tags: [{ type: String, min: 2, max: 50 }],
  mapDetails: { type: String },
  hasOffer: { type: Boolean, default: false },
  location: {
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  inclusions: [{ type: String }],
  exclusions: [{ type: String }],
  adultPricing: [
    {
      adults: { type: Number, required: true },
      price: { type: Number, required: true },
      totalPrice: {
        type: Number,
        default: function () {
          return this.adults * this.price;
        },
      },
    },
  ],
  childrenPricing: [
    {
      children: { type: Number, required: true },
      price: { type: Number, required: true },
      totalPrice: {
        type: Number,
        default: function () {
          return this.children * this.price;
        },
      },
    },
  ],
  price: {
    type: Number,
  },
  duration: { type: String },
  itinerary: [
    {
      title: { type: String, required: true },
      subtitle: { type: String, required: true },
    }
  ],
  historyBrief: { type: String, min: 2 },
  ratingSum: { type: Number, default: 0 },
 averageRating: { type: Number, default: 0 },
 totalReviews: { type: Number, default: 0 },
 ratingSum: { type: Number, default: 0 }, 
 totalTravelers: { type: Number, default: 0 },
}, {
  timestamps: true,
});

schema.index({ title: 'text', description: 'text' });

// Pre-save middleware for price calculation
schema.pre("save", async function (next) {
   if (this.isModified("title")) {
    let baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 1;

    while (await this.constructor.findOne({ slug })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    this.slug = slug;
  }

  if (!this.price && this.adultPricing && this.adultPricing.length > 0) {
    // Calculate the price based on adultPricing
    this.price = this.adultPricing[0].totalPrice;
  }
  next();
});

// Add lean query optimization
schema.statics.findOptimized = function(query = {}, options = {}) {
  const defaultOptions = {
    lean: true,
    ...options
  };
  return this.find(query, null, defaultOptions);
};

// Add aggregation helper for complex queries
schema.statics.aggregateOptimized = function(pipeline) {
  return this.aggregate(pipeline).allowDiskUse(true);
};

const tourModel = mongoose.model("tour", schema);

export default tourModel;
