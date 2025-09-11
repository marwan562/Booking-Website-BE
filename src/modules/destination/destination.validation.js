import joi from "joi";

const imageSchema = joi.object({
  url: joi.string().uri().required(),
  public_id: joi.string().required(),
});

export const createDestinationSchema = joi.object({
  city: joi
    .string()
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.empty": "City is required",
      "string.min": "City must be at least 2 characters long",
      "string.max": "City cannot exceed 100 characters",
    })
    .optional(),

  country: joi.string().min(2).max(100).required().messages({
    "string.empty": "Country is required",
    "string.min": "Country must be at least 2 characters long",
    "string.max": "Country cannot exceed 100 characters",
  }),

  mainImg: imageSchema.required().messages({
    "any.required": "Main image is required",
  }),

  description: joi.string().min(2).max(2000).messages({
    "string.min": "Description must be at least 2 characters long",
    "string.max": "Description cannot exceed 2000 characters",
  }).optional(),

  popular: joi.boolean().optional(),
});

export const updatedDestinationSchema = joi.object({
  id: joi.string().hex().length(24).required(),
  city: joi.string().min(2).max(100).optional().messages({
    "string.min": "City must be at least 2 characters long",
    "string.max": "City cannot exceed 100 characters",
  }),

  country: joi.string().min(2).max(100).optional().messages({
    "string.min": "Country must be at least 2 characters long",
    "string.max": "Country cannot exceed 100 characters",
  }),

  mainImg: imageSchema.optional(),
  images: joi.array().items(imageSchema).optional(),

  description: joi.string().min(10).max(2000).optional().messages({
    "string.min": "Description must be at least 10 characters long",
    "string.max": "Description cannot exceed 2000 characters",
  }),

  popular: joi.boolean().optional(),

  totalTravelers: joi.number().integer().min(0).optional(),
  totalTours: joi.number().integer().min(0).optional(),
  totalReviews: joi.number().integer().min(0).optional(),
  averageRating: joi.number().min(0).max(5).optional(),
});
