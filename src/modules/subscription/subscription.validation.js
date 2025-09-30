import joi from "joi";

export const subscriptionSchema = joi
  .object({
    id: joi.string().hex().length(24).required(),
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
          name: joi.string(),
          price: joi.number().required(),
        })
      )
      .optional(),
    locale: joi.string().valid("en", "es", "fr"),
    couponCode: joi.string().optional(),
    numberOfAdults: joi.number().integer().min(0).required(),
    numberOfChildren: joi.number().integer().min(0).required(),
  })
  .unknown(true);

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
  couponCode: joi.string().optional(),
  adultPricing: joi.string().hex().length(24).optional(),
  childrenPricing: joi.string().hex().length(24).optional(),
  numberOfAdults: joi.number().integer().min(0).required(),
  numberOfChildren: joi.number().integer().min(0).required(),
});
