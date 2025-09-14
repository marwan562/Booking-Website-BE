import mongoose, { Schema } from "mongoose";
import slugify from "slugify";

const localizedSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, required: true},
    es: { type: String, required: true },
  },
  { _id: false }
);

const schema = new Schema(
  {
    title: { type: localizedSchema, required: true },
    slug: { type: String, unique: true },
    description: { type: localizedSchema, required: true },

    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "destination",
      required: true,
    },
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

    date: {
      from: { type: Date },
      to: { type: Date },
    },

    features: [{ type: localizedSchema }],
    includes: [{ type: localizedSchema }],
    notIncludes: [{ type: localizedSchema }],

    options: [
      {
        name: { type: localizedSchema },
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

    category: { type: localizedSchema, required: true },
    tags: [{ type: localizedSchema }],

    mapDetails: { type: String },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    hasOffer: { type: Boolean, default: false },

    durationInMinutes: { type: Number, index: true },
    durationInDays: { type: Number, index: true },

    location: {
      from: localizedSchema,
      to: localizedSchema,
    },
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

    price: { type: Number },
    duration: { type: String },
    itinerary: [
      {
        title: { type: localizedSchema, required: true },
        subtitle: { type: localizedSchema, required: true },
      },
    ],

    historyBrief: { type: localizedSchema },

    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
    totalTravelers: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

schema.index({
  "title.en": "text",
  "title.ar": "text",
  "title.es": "text",
  "description.en": "text",
  "description.ar": "text",
  "description.es": "text",
  category: 1,
  price: 1,
  durationInMinutes: 1,
  totalTravelers: -1,
  averageRating: -1,
  createdAt: -1,
});

schema.pre("save", async function (next) {
  if (this.isModified("title.en")) {
    let baseSlug = slugify(this.title.en, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 1;

    while (await this.constructor.findOne({ slug })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    this.slug = slug;
  }

  if (!this.price && this.adultPricing && this.adultPricing.length > 0) {
    this.price = this.adultPricing[0].totalPrice;
  }

  if (this.isModified("durationInMinutes") || !this.durationInDays) {
    if (this.durationInMinutes) {
      this.durationInDays = Math.ceil(this.durationInMinutes / (24 * 60));
    }
  }

  next();
});

schema.statics.findOptimized = function (query = {}, options = {}) {
  const defaultOptions = {
    lean: true,
    ...options,
  };
  return this.find(query, null, defaultOptions);
};

schema.statics.aggregateOptimized = function (pipeline) {
  return this.aggregate(pipeline).allowDiskUse(true);
};

const tourModel = mongoose.model("tour", schema);
export default tourModel;
