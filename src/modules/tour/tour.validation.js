import joi from "joi";

const imgSchema = joi.object({
  url: joi.string(),
  public_id: joi.string(),
});

const adultPricing = joi.array().items(
  joi.object({
    _id: joi.string().hex().length(24),
    totalPrice: joi.number(),
    adults: joi.number(),
    price: joi.number(),
  })
);

const couponSchema = joi
  .object({
    _id: joi.string().hex().length(24).optional(),
    code: joi.string().uppercase().trim().required(),
    discountPercent: joi.number().min(0).max(100).required(),
    isActive: joi.boolean().default(true),
    validFrom: joi.date().optional(),
    validTo: joi.date().optional(),
  })
  .optional();

const childrenPricing = joi.array().items(
  joi.object({
    _id: joi.string().hex().length(24),
    totalPrice: joi.number(),
    children: joi.number().min(1).max(30),
    price: joi.number().min(1).max(10000),
  })
);

const localizedSchema = joi.object({
  en: joi.string().required(),
  es: joi.string().required(),
  fr: joi.string(),
});

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

const options = joi.array().items(
  joi.object({
    name: localizedSchema.required(),
    price: joi.number().required(),
    childPrice: joi.number(),
  })
);

const location = joi.object({
  from: localizedSchema.required(),
  to: localizedSchema.required(),
});

const itinerarySchema = joi.object({
  title: localizedSchema.required(),
  subtitle: localizedSchema.required(),
});

export const createTourSchema = joi.object({
  title: localizedSchema.required(),
  description: localizedSchema.required(),
  category: localizedSchema.required(),
  historyBrief: localizedSchema.required(),

  imagesToDelete: joi.array().items(joi.string()).optional(),
  imagesToKeep: joi.array().items(joi.string()).optional(),

  destination: joi.string().hex().length(24).required(),

  mainImg: imgSchema.required(),
  images: joi.array().items(imgSchema).min(1).required(),

  date: joi
    .object({
      from: joi.date().required(),
      to: joi.date().required(),
    })
    .required(),

  features: joi.array().items(localizedSchema),
  includes: joi.array().items(localizedSchema),
  notIncludes: joi.array().items(localizedSchema),
  tags: joi.array().items(localizedSchema),

  price: joi.number().optional(),

  repeatTime: joi.array().items(joi.string().min(1).max(10)).min(1),
  repeatDays: repeatDays.min(1),

  location: location.required(),
  mapDetails: joi.string().allow(""),

  options: options.required(),
  isRepeated: joi.boolean().required(),
  hasOffer: joi.boolean(),

  adultPricing: adultPricing.required(),
  childrenPricing: childrenPricing,

  duration: joi.string().min(1).max(20).required(),
  durationInMinutes: joi.number().min(0),
  durationInDays: joi.number().min(0),

  itinerary: joi.array().items(itinerarySchema).min(1).required(),

  discountPercent: joi.number().min(0).max(100),

  coupons: joi.array().items(couponSchema).optional(),

  isTrending: joi.boolean().optional(),
  isTopRated: joi.boolean().optional(),
});

export const updatedTourSchema = joi.object({
  id: joi.string().hex().length(24).required(),
  title: localizedSchema.optional(),
  description: localizedSchema.optional(),
  category: localizedSchema.optional(),
  historyBrief: localizedSchema.optional(),

  imagesToDelete: joi.array().items(joi.string()).optional(),
  imagesToKeep: joi.array().items(joi.string()).optional(),

  destination: joi.string().hex().length(24).optional(),

  mainImg: imgSchema.optional(),
  images: joi.array().items(imgSchema).optional().allow(null),

  date: joi
    .object({
      from: joi.date().optional(),
      to: joi.date().optional(),
    })
    .optional(),

  features: joi.array().items(localizedSchema),
  includes: joi.array().items(localizedSchema),
  notIncludes: joi.array().items(localizedSchema),
  tags: joi.array().items(localizedSchema),

  price: joi.number().optional(),

  repeatTime: joi.array().items(joi.string().min(1).max(10)).min(1),
  repeatDays: repeatDays.min(1),

  location: location.optional(),
  mapDetails: joi.string().allow(""),

  options: options.optional(),
  isRepeated: joi.boolean().optional(),
  hasOffer: joi.boolean(),

  adultPricing: adultPricing.min(1).optional(),
  childrenPricing: childrenPricing.min(0),

  duration: joi.string().min(1).max(20).optional(),
  durationInMinutes: joi.number().min(0),
  durationInDays: joi.number().min(0),

  itinerary: joi.array().items(itinerarySchema).min(1).optional(),

  discountPercent: joi.number().min(0).max(100),

  coupons: joi.array().items(couponSchema).optional(),

  isTrending: joi.boolean().optional(),
  isTopRated: joi.boolean().optional(),
});
