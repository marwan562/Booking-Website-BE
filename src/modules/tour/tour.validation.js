import joi from "joi";

const imgSchema = joi.object({
  url: joi.string(),
  public_id: joi.string(),
});

const itineraySchema = joi.object({
  title: joi.string().optional(),
  subtitle: joi.string().optional(),
});

const adultPricing = joi.array().items(
  joi.object({
    adults: joi.number().min(1).max(30),
    price: joi.number().min(1).max(10000),
  })
);

const childrenPricing = joi.array().items(
  joi.object({
    children: joi.number().min(1).max(30),
    price: joi.number().min(1).max(10000),
  })
);

const options = joi.array().items(
  joi.object({
    name: joi.string().min(1).max(100),
    price: joi.number().min(1).max(10000),
    childPrice: joi.number().min(1).max(10000),
  })
);
const repeatDays = joi
  .array()
  .items(
    joi
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
  )
  .min(1);

const location = joi.object({
  from: joi.string().min(1).max(50),
  to: joi.string().min(1).max(50),
});
import Joi from "joi";

export const createTourSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  description: Joi.string().min(10).max(20000).required(),
  destination: Joi.string().hex().length(24).required(),

  mainImg: imgSchema.required(),
  images: Joi.array().items(imgSchema).min(1),

  category: Joi.string().required(),
  options: options,
  isRepeated: Joi.boolean(),
  hasOffer: Joi.boolean(),

  repeatTime: Joi.array().items(Joi.string().min(1).max(10)).min(1),
  repeatDays: repeatDays,

  location: location.required(),
  mapDetails: Joi.string(),

  inclusions: Joi.array().items(Joi.string().min(5).max(100)),
  exclusions: Joi.array().items(Joi.string().min(5).max(100)),

  adultPricing: adultPricing.min(1).required(),
  childrenPricing: childrenPricing,

  duration: Joi.string().min(1).max(20).required(),

  itinerary: Joi.array().items(itineraySchema).min(1),

  tags: Joi.array().items(Joi.string().min(2).max(50)),
  historyBrief: Joi.string().min(1),

  date: Joi.object({
    from: Joi.date().required(),
    to: Joi.date().required(),
  }),
  features: Joi.array().items(Joi.string()),
  includes: Joi.array().items(Joi.string()),
  notIncludes: Joi.array().items(Joi.string()),
  discountPercent: Joi.number().min(0).max(100),
  durationInMinutes: Joi.number().min(0),
  durationInDays: Joi.number().min(0),
});

export const updatedTourSchema = joi.object({
  id: joi.string().hex().length(24).optional(),
  title: Joi.string().min(1).max(100).optional(),
  description: Joi.string().min(10).max(20000).optional(),
  destination: Joi.string().hex().length(24).optional(),

  mainImg: imgSchema.optional(),
  images: Joi.array().items(imgSchema).min(1),

  category: Joi.string().optional(),
  options: options,
  isRepeated: Joi.boolean(),
  hasOffer: Joi.boolean(),

  repeatTime: Joi.array().items(Joi.string().min(1).max(10)).min(1),
  repeatDays: repeatDays,

  location: location.optional(),
  mapDetails: Joi.string(),

  inclusions: Joi.array().items(Joi.string().min(5).max(100)),
  exclusions: Joi.array().items(Joi.string().min(5).max(100)),

  adultPricing: adultPricing.min(1).optional(),
  childrenPricing: childrenPricing,

  duration: Joi.string().min(1).max(20).optional(),

  itinerary: Joi.array().items(itineraySchema).min(1),

  tags: Joi.array().items(Joi.string().min(2).max(50)),
  historyBrief: Joi.string().min(1),

  date: Joi.object({
    from: Joi.date().optional(),
    to: Joi.date().optional(),
  }),
  features: Joi.array().items(Joi.string()),
  includes: Joi.array().items(Joi.string()),
  notIncludes: Joi.array().items(Joi.string()),
  discountPercent: Joi.number().min(0).max(100),
  durationInMinutes: Joi.number().min(0),
  durationInDays: Joi.number().min(0),
});
