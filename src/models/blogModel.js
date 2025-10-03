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

const localizedSchemaOptional = new mongoose.Schema(
  {
    en: { type: String, required: false },
    es: { type: String, required: false },
    fr: { type: String, required: false },
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema({
  text: String,
  approved: Boolean,
  author: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  replies: [
    {
      text: String,
      author: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    },
  ],
});

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

    // Main hero image
    image: {
      url: {
        type: String,
        required: [true, "Image URL is required"],
      },
      public_id: { type: String },
      alt: { type: String },
      caption: { type: localizedSchemaOptional },
    },

    additionalImages: [
      {
        url: { type: String, required: true },
        public_id: { type: String },
        alt: { type: String },
        caption: { type: localizedSchemaOptional },
        position: { type: String },
      },
    ],

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
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

    relatedTopics: [{ type: localizedSchema }],

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

    shares: {
      type: Number,
      default: 0,
    },

    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          required: true,
        },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        approved: { type: Boolean, default: false },
        replies: [
          {
            author: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "user",
              required: true,
            },
            content: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
            approved: { type: Boolean, default: false },
          },
        ],
      },
    ],

    newsletterSignups: {
      type: Number,
      default: 0,
    },

    seo: {
      metaTitle: { type: localizedSchemaOptional },
      metaDescription: { type: localizedSchemaOptional },
      keywords: {
        type: [localizedSchemaOptional],
        default: undefined,
      },
      ogImage: { type: String },
      ogDescription: {
        en: { type: String, required: false },
        es: { type: String, required: false },
        fr: { type: String, required: false },
      },
    },

    structuredData: {
      breadcrumbs: [
        {
          name: { type: localizedSchema },
          url: { type: String },
        },
      ],
      faq: [
        {
          question: { type: localizedSchema },
          answer: { type: localizedSchema },
        },
      ],
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    scheduledFor: {
      type: Date,
      default: null,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    contentSections: [
      {
        type: {
          type: String,
          enum: ["tip", "paragraph", "image", "list", "quote"],
        },
        title: { type: localizedSchema },
        content: { type: localizedSchema },
        order: { type: Number },
        icon: { type: String },
        highlighted: { type: Boolean, default: false },
      },
    ],
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
blogSchema.index({ views: -1 });
blogSchema.index({ likes: -1 });
blogSchema.index({ "relatedTopics.en": 1 });

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

blogSchema.virtual("readTimeDisplay").get(function () {
  return `${this.readTime} min read`;
});

blogSchema.virtual("commentCount").get(function () {
  return this.comments ? this.comments.filter((c) => c.approved).length : 0;
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

  if (!isNewDoc) {
    this.lastUpdated = new Date();
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

blogSchema.statics.getRelatedPosts = function (
  blogId,
  category,
  locale = "en",
  limit = 5
) {
  return this.find({
    _id: { $ne: blogId },
    status: "published",
    [`category.${locale}`]: { $regex: category, $options: "i" },
  })
    .populate("author", "name lastname avatar")
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select("title slug excerpt image publishedAt readTime views author");
};

blogSchema.statics.getMostPopular = function (limit = 10) {
  return this.find({ status: "published" })
    .sort({ views: -1, likes: -1 })
    .limit(limit)
    .select("title slug views likes publishedAt");
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

blogSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

blogSchema.methods.incrementLikes = function () {
  this.likes += 1;
  return this.save();
};

blogSchema.methods.incrementShares = function () {
  this.shares += 1;
  return this.save();
};

const blogModel = mongoose.model("blog", blogSchema);

export default blogModel;
