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
  options: joi
    .array()
    .items(
      joi.object({
        id: joi.string().hex().length(24),
        number: joi.number().min(1).max(500),
        numberOfChildren: joi.number(),
        price: joi.number().required(),
      })
    )
    .optional(),
    locale: joi.string().valid("en","es","ar")
});

export const updateCartSchema = joi.object({
  id: joi.string().hex().length(24).required(),
  time: joi.string().optional(),
  date: joi.string().optional(),
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
    )
    .optional(),
  options: joi
    .array()
    .items(
      joi.object({
        id: joi.string().hex().length(24),
        number: joi.number().min(1).max(500),
        numberOfChildren: joi.number(),
        price: joi.number().required(),
      })
    )
    .optional(),
  adultPricing: joi.string().hex().length(24).optional(),
  childrenPricing: joi.string().hex().length(24).optional(),
});
