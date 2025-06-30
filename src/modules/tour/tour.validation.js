import joi from "joi";

const imgSchema = joi.object({
  url: joi.string(),
  public_id: joi.string()
});

const adultPricing = joi.array().items(
  joi.object({
    adults: joi.number().min(1).max(30),
    price: joi.number().min(1).max(10000)
  })
);

const childrenPricing = joi.array().items(
  joi.object({
    children: joi.number().min(1).max(30),
    price: joi.number().min(1).max(10000)
  })
);

const options = joi.array().items(
  joi.object({
    name: joi.string().min(5).max(100),
    price: joi.number().min(10).max(10000),
    childPrice: joi.number().min(10).max(10000)
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
  to: joi.string().min(1).max(50)
});
export const createTourSchema = joi.object({
  title: joi.string().min(3).max(100).required(),
  description: joi.string().min(10).max(20000).required(),
  mainImg: imgSchema.required(),
  images: joi.array().items(imgSchema),
  category: joi.string().required(),
  options: options,
  isRepeated: joi.boolean(),
  hasOffer: joi.boolean(),
  repeatTime: joi.array().items(joi.string().min(1).max(10)).min(1),
  repeatDays: repeatDays,
  location: location.required(),
  mapDetails: joi.string(),
  inclusions: joi.array().items(joi.string().min(5).max(100)),
  exclusions: joi.array().items(joi.string().min(5).max(100)),
  adultPricing: adultPricing.min(1).required(),
  childrenPricing: childrenPricing,
  duration: joi.string().min(2).max(20),
  itinerary: joi.string(),
  tags: joi.array().items(joi.string().min(2).max(50)),
  historyBrief: joi.string().min(2)
});

export const updatedTourSchema = joi.object({
  id: joi.string().hex().length(24).required(),
  title: joi.string().min(3).max(100),
  description: joi.string().min(10).max(2000),
  mainImg: imgSchema,
  images: joi.array().items(imgSchema),
  category: joi.string(),
  options: options,
  isRepeated: joi.boolean(),
  hasOffer: joi.boolean(),
  repeatTime: joi.array().items(joi.string().min(1).max(10)).min(1),
  repeatDays: repeatDays,
  location: location,
  mapDetails: joi.string(),
  inclusions: joi.array().items(joi.string().min(5).max(100)),
  exclusions: joi.array().items(joi.string().min(5).max(100)),
  adultPricing: adultPricing,
  childrenPricing: childrenPricing,
  duration: joi.string().min(2).max(20),
  itinerary: joi.string(),
  tags: joi.array().items(joi.string().min(2).max(50)),
  historyBrief: joi.string().min(2)
});
