import joi from "joi";
export const subscriptionSchema = joi.object({
  id: joi.string().hex().length(24).required(),
  adultPricing: joi.string().hex().length(24).required(),
  childrenPricing: joi.string().hex().length(24),
  time: joi.string(),
  date: joi.string(),
  day: joi
    .string()
    .valid(
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ),
  options: joi.array().items(
    joi.object({
      id: joi.string().hex().length(24),
      number: joi.number().min(1).max(500),
      numberOfChildren: joi.number()
    })
  )
});
