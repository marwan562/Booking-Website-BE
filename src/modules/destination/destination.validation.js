import joi from "joi";

const localizedStringSchema = joi.object({
  en: joi.string().messages({
    "string.empty": "English value is required",
  }),
  ar: joi.string().messages({
    "string.empty": "Arabic value is required",
  }),
  es: joi.string().messages({
    "string.empty": "Spanish value is required",
  }),
  fr: joi.string().messages({
    "string.empty": "French value is required",
  }),
});

const imageSchema = joi.object({
  url: joi.string().uri().required(),
  public_id: joi.string().required(),
});

export const createDestinationSchema = joi.object({
  city: localizedStringSchema,

  country: localizedStringSchema,

  mainImg: imageSchema,

  description: localizedStringSchema.optional(),

  popular: joi.boolean().optional(),
});

export const updatedDestinationSchema = joi.object({
  id: joi.string().hex().length(24).required(),
  city: localizedStringSchema.optional(),

  country: localizedStringSchema.optional(),

  mainImg: imageSchema.optional(),
  images: joi.array().items(imageSchema).optional(),

  description: localizedStringSchema.optional(),
  popular: joi.boolean().optional(),
  totalTours: joi.number().optional()
});
