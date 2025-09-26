import mongoose from "mongoose";
import slugify from "slugify";

const localizedSchema = new mongoose.Schema(
  {
    en: { type: String, required: true },
    es: { type: String, required: true },
    fr: { type: String, required: false },
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: localizedSchema, required: true },
    slug: { type: localizedSchema, unique: true },
    excerpt: { type: localizedSchema, required: true },
    content: { type: localizedSchema, required: true },

    category: {
      type: localizedSchema,
      required: true,
      validate: {
        validator: function (v) {
          const validCategories = [
            "City Guide",
            "Cultural Tours",
            "Day Trips",
            "Food & Culture",
            "Adventure",
            "General",
          ];
          return validCategories.includes(v.en);
        },
        message: "Invalid category",
      },
    },

    image: {
      url: {
        type: String,
        required: [true, "Image URL is required"],
      },
      public_id: { type: String },
      alt: { type: String },
      caption: { type: localizedSchema },
    },

    author: {
      name: {
        type: String,
        required: [true, "Author name is required"],
      },
      email: {
        type: String,
        required: [true, "Author email is required"],
      },
      avatar: {
        type: String,
        default: "",
      },
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },

    featured: {
      type: Boolean,
      default: false,
    },

    trending: {
      type: Boolean,
      default: false,
    },

    tags: [{ type: localizedSchema }],

    readTime: {
      type: Number,
      default: 5,
    },

    views: {
      type: Number,
      default: 0,
    },

    likes: {
      type: Number,
      default: 0,
    },

    seo: {
      metaTitle: { type: localizedSchema },
      metaDescription: { type: localizedSchema },
      keywords: [{ type: localizedSchema }],
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    scheduledFor: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

blogSchema.index({
  "title.en": "text",
  "title.es": "text",
  "title.fr": "text",
  "excerpt.en": "text",
  "excerpt.es": "text",
  "excerpt.fr": "text",
  "content.en": "text",
  "content.es": "text",
  "content.fr": "text",
  category: 1,
  status: 1,
  featured: 1,
  trending: 1,
  publishedAt: -1,
  createdAt: -1,
});

blogSchema.index({ "slug.en": 1 });
blogSchema.index({ "slug.es": 1 });
blogSchema.index({ "slug.fr": 1 });
blogSchema.index({ "category.en": 1, status: 1 });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ featured: 1, status: 1 });
blogSchema.index({ trending: 1, status: 1 });

blogSchema.virtual("formattedPublishDate").get(function () {
  if (this.publishedAt) {
    return this.publishedAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return null;
});

blogSchema.pre("save", async function (next) {
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
        let baseSlug = slugify(this.title[lang], {
          lower: true,
          locale: lang,
          trim: true,
          remove: /[*+~.()'"!:@،؟]/g,
        });

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

  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  if (this.isModified("content")) {
    const contentToAnalyze =
      this.content.en || this.content.es || this.content.fr || "";
    const wordCount = contentToAnalyze.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
  }

  next();
});

blogSchema.statics.getFeatured = function (locale = "en") {
  return this.find({
    status: "published",
    featured: true,
  }).sort({ publishedAt: -1 });
};

blogSchema.statics.getTrending = function (locale = "en") {
  return this.find({
    status: "published",
    trending: true,
  }).sort({ views: -1, publishedAt: -1 });
};

blogSchema.statics.getByCategory = function (category, locale = "en") {
  return this.find({
    status: "published",
    [`category.${locale}`]: { $regex: category, $options: "i" },
  }).sort({ publishedAt: -1 });
};

blogSchema.statics.findOptimized = function (query = {}, options = {}) {
  const defaultOptions = {
    lean: true,
    ...options,
  };
  return this.find(query, null, defaultOptions);
};

blogSchema.statics.aggregateOptimized = function (pipeline) {
  return this.aggregate(pipeline).allowDiskUse(true);
};

const blogModel = mongoose.model("blog", blogSchema);

export default blogModel;
