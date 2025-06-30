import joi from "joi";
export const createReviewSchema = joi.object({
  id: joi.string().hex().length(24).required(),
  rating: joi.number().min(1).max(5).required(),
  comment: joi.string().max(7000),
  time: joi.string(),
});
export const editReviewSchmea = joi.object({
  id: joi.string().hex().length(24).required(),
  rating: joi.number().min(1).max(5),
  comment: joi.string().max(7000),
  time: joi.string(),
});
export const ReviewSchmea = joi.object({
  id: joi.string().hex().length(24).required(),
});
