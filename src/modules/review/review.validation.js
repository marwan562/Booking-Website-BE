import Joi from "joi";

const imgSchema = Joi.object({
  url: Joi.string(),
  public_id: Joi.string(),
});

export const createReviewSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
  rating: Joi.number().min(1).max(5).required().messages({
    "number.base": "Rating must be a number between 1 and 5",
    "number.min": "Rating must be a number between 1 and 5",
    "number.max": "Rating must be a number between 1 and 5",
    "any.required": "Rating is required",
  }),
  comment: Joi.string().max(7000),
  images: Joi.any().optional(),
  // Admin-only fields for fake reviews
  name: Joi.string().optional(),
  avatar: Joi.alternatives().try(
    Joi.object({
      url: Joi.string().optional(),
      public_id: Joi.string().optional(),
    }),
    Joi.string()
  ).optional(),
  nationality: Joi.string().optional(),
  user: Joi.string().hex().length(24).optional(),
});

export const createLeaveAReviewSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  rating: Joi.number().min(1).max(5).required().messages({
    "number.base": "Rating must be a number between 1 and 5",
    "number.min": "Rating must be a number between 1 and 5",
    "number.max": "Rating must be a number between 1 and 5",
    "any.required": "Rating is required",
  }),
  comment: Joi.string().max(7000),
  images: Joi.any().optional(),
});


export const editReviewSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
  rating: Joi.number().min(1).max(5).messages({
    "number.base": "Rating must be a number between 1 and 5",
  }),
  comment: Joi.string().max(7000),
  images: Joi.array().items(imgSchema).optional(),
  // Admin-only fields for fake reviews
  name: Joi.string().optional(),
  avatar: Joi.alternatives().try(
    Joi.object({
      url: Joi.string().optional(),
      public_id: Joi.string().optional(),
    }),
    Joi.string()
  ).optional(),
  nationality: Joi.string().optional(),
  user: Joi.string().hex().length(24).optional(),
});

export const reviewSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});
