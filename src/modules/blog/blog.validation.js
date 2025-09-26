import { body } from "express-validator";

const blogValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 10, max: 200 })
    .withMessage("Title must be between 10 and 200 characters"),

  body("excerpt")
    .notEmpty()
    .withMessage("Excerpt is required")
    .isLength({ min: 50, max: 500 })
    .withMessage("Excerpt must be between 50 and 500 characters"),

  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 200 })
    .withMessage("Content must be at least 200 characters"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn([
      "City Guide",
      "Cultural Tours",
      "Day Trips",
      "Food & Culture",
      "Adventure",
      "General",
    ])
    .withMessage("Invalid category"),

  body("image.url")
    .notEmpty()
    .withMessage("Image URL is required")
    .isURL()
    .withMessage("Invalid image URL"),

  body("author.name").notEmpty().withMessage("Author name is required"),

  body("author.email")
    .notEmpty()
    .withMessage("Author email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),

  body("seo.metaTitle")
    .optional()
    .isLength({ max: 60 })
    .withMessage("Meta title cannot exceed 60 characters"),

  body("seo.metaDescription")
    .optional()
    .isLength({ max: 160 })
    .withMessage("Meta description cannot exceed 160 characters"),
];

export {blogValidation}