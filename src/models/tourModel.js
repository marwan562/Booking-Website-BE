import mongoose, { Schema } from "mongoose";
import slugify from "slugify";

const localizedSchema = new Schema(
  {
    en: { type: String, required: true },
    es: { type: String, required: false },
    fr: { type: String, required: false },
  },
  { _id: false }
);

const localizedOptionalSchema = new Schema(
  {
    en: { type: String, required: false },
    es: { type: String, required: false },
    fr: { type: String, required: false },
  },
  { _id: false }
);

const optionSchema = new Schema(
  {
    name: localizedSchema,
    price: Number,
    childPrice: {
      type: Number,
      default: function () {
        return this.price * 0.5;
      },
    },
  },
  { _id: true }
);

const tourLanguageSchema = new Schema({
  flag: { type: String },
  description: { type: localizedOptionalSchema },
});

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    isActive: { type: Boolean, default: true },
    validFrom: { type: Date },
    validTo: { type: Date },
  },
  { _id: true }
);

const refundPolicySchema = new Schema(
  {
    daysBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    notePolicy: { type: localizedOptionalSchema },
  },
  { _id: true }
);

const freeCancelationSchema = new Schema({
  note: { type: localizedOptionalSchema },
  description: { type: localizedOptionalSchema },
});

const schema = new Schema(
  {
    title: { type: localizedSchema, required: true },
    slug: { type: localizedSchema, unique: true },
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

    tourLanguage: { type: tourLanguageSchema },

    freeCancelation: { type: freeCancelationSchema },

    features: [{ type: localizedSchema }],
    includes: [{ type: localizedSchema }],
    notIncludes: [{ type: localizedSchema }],

    options: [optionSchema],
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
    itinerary: [{ type: localizedSchema }],

    historyBrief: { type: localizedSchema },

    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
    totalTravelers: { type: Number, default: 0 },

    coupons: {
      type: [couponSchema],
      select: false,
    },

    refundPolicy: {
      type: [refundPolicySchema],
      default: [{ daysBefore: 4, discountPercent: 0 }],
    },

    isTrending: { type: Boolean, default: false, index: true },
    isTopRated: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
);

schema.index({
  "title.en": "text",
  "title.es": "text",
  "title.fr": "text",
  "description.en": "text",
  "description.es": "text",
  "description.fr": "text",
  category: 1,
  price: 1,
  durationInMinutes: 1,
  totalTravelers: -1,
  averageRating: -1,
  createdAt: -1,
});
schema.index({ isTrending: -1 });
schema.index({ isTopRated: -1 });
schema.index({ "slug.en": -1 });
schema.index({ "slug.es": -1 });
schema.index({ "slug.fr": -1 });

schema.pre("save", async function (next) {
  if (this.adultPricing?.length) {
    this.adultPricing = this.adultPricing.map((item) => ({
      ...(item.toObject?.() || item),
      totalPrice: item.adults * item.price,
    }));
  }

  if (this.childrenPricing?.length) {
    this.childrenPricing = this.childrenPricing.map((item) => ({
      ...(item.toObject?.() || item),
      totalPrice: item.children * item.price,
    }));
  }

  const langs = ["en", "es", "fr"];
  const isNewDoc = this.isNew;

  if (
    langs.some((lang) => this.isModified(`title.${lang}`)) ||
    !this.slug ||
    isNewDoc
  ) {
    this.slug = this.slug || {};

    for (const lang of langs) {
      if (!this.title?.[lang]) continue;

      if (this.isModified(`title.${lang}`) || !this.slug[lang]) {
        let baseSlug;

        baseSlug = slugify(this.title[lang], {
          lower: true,
          locale: lang,
          trim: true,
          remove: /[*+~.()'"!:@،؟]/g,
          replacement: '-',
        }).replace(/\//g, '-');

        let slug = baseSlug;
        let count = 1;

        while (
          await this.constructor.findOne({
            [`slug.${lang}`]: slug,
            _id: { $ne: this._id },
          })
        ) {
          slug = `${baseSlug}-${count}`;
          count++;
        }

        this.slug[lang] = slug;
      }
    }
  }

  if (!this.price && this.adultPricing?.length > 0) {
    this.price = this.adultPricing[0].totalPrice;
  }

  if (this.adultPricing?.length < 1 && this.price) {
    this.adultPricing = [
      {
        adults: 1,
        price: this.price,
        totalPrice: this.price,
      },
    ];
  }

  if (this.isModified("durationInMinutes") || !this.durationInDays) {
    if (this.durationInMinutes) {
      this.durationInDays = Math.ceil(this.durationInMinutes / (24 * 60));
    }
  }

  if (this.isModified("refundPolicy") && Array.isArray(this.refundPolicy)) {
    if (this.refundPolicy.length > 1) {
      this.refundPolicy.sort((a, b) => a.daysBefore - b.daysBefore);
    }

    if (this.refundPolicy.length < 1) {
      this.refundPolicy = [{ daysBefore: 4, discountPercent: 0 }];
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
