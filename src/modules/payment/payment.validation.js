import Joi from "joi";

export const fwaterkSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
  currency: Joi.string().valid("USD", "EGP", "EUR").required().messages({
    "any.required": "Currency is required",
    "any.only": "Currency must be one of USD, EGP, or EUR",
  }),
});

export const refundSchema = Joi.object({
  bookingReference: Joi.string().required(),
});
