import { body } from "express-validator";

const validCategories = [
  "City Guide",
  "Cultural Tours",
  "Day Trips",
  "Food & Culture",
  "Adventure",
  "General",
];

const blogValidation = [
  body("title").notEmpty().withMessage("Title object is required"),
  body("title.en")
    .notEmpty()
    .withMessage("English title is required")
    .isLength({ min: 10, max: 200 })
    .withMessage("English title must be between 10 and 200 characters"),
  body("title.es")
    .notEmpty()
    .withMessage("Spanish title is required")
    .isLength({ min: 10, max: 200 })
    .withMessage("Spanish title must be between 10 and 200 characters"),
  body("title.fr")
    .optional()
    .isLength({ min: 10, max: 200 })
    .withMessage("French title must be between 10 and 200 characters"),

  body("excerpt").notEmpty().withMessage("Excerpt object is required"),
  body("excerpt.en")
    .notEmpty()
    .withMessage("English excerpt is required")
    .isLength({ min: 50, max: 500 })
    .withMessage("English excerpt must be between 50 and 500 characters"),
  body("excerpt.es")
    .notEmpty()
    .withMessage("Spanish excerpt is required")
    .isLength({ min: 50, max: 500 })
    .withMessage("Spanish excerpt must be between 50 and 500 characters"),
  body("excerpt.fr")
    .optional()
    .isLength({ min: 50, max: 500 })
    .withMessage("French excerpt must be between 50 and 500 characters"),

  body("content").notEmpty().withMessage("Content object is required"),
  body("content.en")
    .notEmpty()
    .withMessage("English content is required")
    .isLength({ min: 200 })
    .withMessage("English content must be at least 200 characters"),
  body("content.es")
    .notEmpty()
    .withMessage("Spanish content is required")
    .isLength({ min: 200 })
    .withMessage("Spanish content must be at least 200 characters"),
  body("content.fr")
    .optional()
    .isLength({ min: 200 })
    .withMessage("French content must be at least 200 characters"),

  body("category").notEmpty().withMessage("Category object is required"),
  body("category.en")
    .notEmpty()
    .withMessage("English category is required")
    .isIn(validCategories)
    .withMessage("English category must be one of: City Guide, Cultural Tours, Day Trips, Food & Culture, Adventure, General"),
  body("category.es")
    .notEmpty()
    .withMessage("Spanish category is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Spanish category must be between 1 and 100 characters"),
  body("category.fr")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("French category must be between 1 and 100 characters"),

  body("image").notEmpty().withMessage("Image object is required"),
  body("image.url")
    .notEmpty()
    .withMessage("Image URL is required")
    .isURL()
    .withMessage("Invalid image URL"),
  body("image.alt")
    .optional()
    .isLength({ max: 125 })
    .withMessage("Image alt text cannot exceed 125 characters"),
  body("image.caption").optional().notEmpty().withMessage("Image caption object cannot be empty"),
  body("image.caption.en")
    .optional()
    .isLength({ max: 200 })
    .withMessage("English image caption cannot exceed 200 characters"),
  body("image.caption.es")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Spanish image caption cannot exceed 200 characters"),
  body("image.caption.fr")
    .optional()
    .isLength({ max: 200 })
    .withMessage("French image caption cannot exceed 200 characters"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["draft", "published", "archived"])
    .withMessage("Status must be one of: draft, published, archived"),

  body("featured")
    .optional()
    .isBoolean()
    .withMessage("Featured must be a boolean"),
  body("trending")
    .optional()
    .isBoolean()
    .withMessage("Trending must be a boolean"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),
  body("tags.*.en")
    .notEmpty()
    .withMessage("English tag is required")
    .isLength({ max: 50 })
    .withMessage("English tag cannot exceed 50 characters"),
  body("tags.*.es")
    .notEmpty()
    .withMessage("Spanish tag is required")
    .isLength({ max: 50 })
    .withMessage("Spanish tag cannot exceed 50 characters"),
  body("tags.*.fr")
    .optional()
    .isLength({ max: 50 })
    .withMessage("French tag cannot exceed 50 characters"),

  body("seo").optional().notEmpty().withMessage("SEO object cannot be empty"),
  body("seo.metaTitle").optional().notEmpty().withMessage("Meta title object cannot be empty"),
  body("seo.metaTitle.en")
    .optional()
    .isLength({ max: 60 })
    .withMessage("English meta title cannot exceed 60 characters"),
  body("seo.metaTitle.es")
    .optional()
    .isLength({ max: 60 })
    .withMessage("Spanish meta title cannot exceed 60 characters"),
  body("seo.metaTitle.fr")
    .optional()
    .isLength({ max: 60 })
    .withMessage("French meta title cannot exceed 60 characters"),
  body("seo.metaDescription").optional().notEmpty().withMessage("Meta description object cannot be empty"),
  body("seo.metaDescription.en")
    .optional()
    .isLength({ max: 160 })
    .withMessage("English meta description cannot exceed 160 characters"),
  body("seo.metaDescription.es")
    .optional()
    .isLength({ max: 160 })
    .withMessage("Spanish meta description cannot exceed 160 characters"),
  body("seo.metaDescription.fr")
    .optional()
    .isLength({ max: 160 })
    .withMessage("French meta description cannot exceed 160 characters"),
  body("seo.keywords")
    .optional()
    .isArray()
    .withMessage("SEO keywords must be an array"),
  body("seo.keywords.*.en")
    .optional()
    .isLength({ max: 50 })
    .withMessage("English keyword cannot exceed 50 characters"),
  body("seo.keywords.*.es")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Spanish keyword cannot exceed 50 characters"),
  body("seo.keywords.*.fr")
    .optional()
    .isLength({ max: 50 })
    .withMessage("French keyword cannot exceed 50 characters"),

  body("readTime")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Read time must be a positive integer"),

  body("publishedAt")
    .optional()
    .isISO8601()
    .withMessage("Published date must be a valid ISO 8601 date"),
  body("scheduledFor")
    .optional()
    .isISO8601()
    .withMessage("Scheduled date must be a valid ISO 8601 date"),
];

export { blogValidation };