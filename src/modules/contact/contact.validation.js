import joi from "joi";

export const contactValidation = joi.object({
  subject: joi
    .string()
    .valid(
      "My personal information",
      "Technical support",
      "Billing inquiry",
      "General question",
      "Partnership opportunity"
    )
    .required(),
  name: joi.string().min(2).max(50).required(),
  email: joi.string().email().required(),
  message: joi.string().min(1).required(),
  attachedFiles: joi.array().items(
    joi.object({
      url: joi.string().uri(),
      public_id: joi.string(),
    })
  ).optional(),
});
