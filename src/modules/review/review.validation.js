import Joi from "joi";

export const createReviewSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
  rating: Joi.number().min(1).max(5).required().messages({
    "number.base": "Rating must be a number between 1 and 5",
    "number.min": "Rating must be a number between 1 and 5",
    "number.max": "Rating must be a number between 1 and 5",
    "any.required": "Rating is required",
  }),
  comment: Joi.string().max(7000),
});

export const editReviewSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
  rating: Joi.number().min(1).max(5).messages({
    "number.base": "Rating must be a number between 1 and 5",
  }),
  comment: Joi.string().max(7000),
});

export const reviewSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});
