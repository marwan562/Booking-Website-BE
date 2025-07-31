import joi from "joi";

const userSchemaLogin = joi.object({
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  password: joi
    .string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "Password is required",
    }),
});

const userSchemaCreate = joi.object({
  name: joi
    .string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "string.min": "Name must be at least 2 characters long",
      "string.max": "Name cannot exceed 50 characters",
      "string.pattern.base": "Name can only contain letters and spaces",
      "any.required": "Name is required",
    }),
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  password: joi
    .string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "Password is required",
    }),
  rePassword: joi.string().valid(joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
    "string.empty": "Confirm password is required",
  }),
  avatar: joi.object({
    url: joi.string().uri(),
    public_id: joi.string(),
  }),
  age: joi.number().min(17).max(100),
  nationality: joi.string(),
  phone: joi.string().required().messages({
    "any.required": "Phone number is required",
  }),
  gender: joi.string().valid("male", "female", "other").required(),
});

const userSchemaUpdate = joi.object({
  id: joi.string().hex().length(24),
  name: joi.string().min(2).max(15),
  email: joi.string().email({ tlds: { allow: false } }),
  password: joi
    .string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  rePassword: joi.ref("password"),
  avatar: joi.object({
    url: joi.string().uri(),
    public_id: joi.string(),
  }),
  age: joi.number().integer().min(1).max(120),
  nationality: joi
    .string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/),
  phone: joi.number().integer().positive(),
  country: joi.string(),
  gender: joi.string().valid("male", "female", "other").messages({
    "any.only": "Gender must be one of Male, Female, or Other",
  }),
});

const forgetPasswordSchema = joi.object({
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  code: joi.number().integer().min(1000).max(9999).required().messages({
    "number.base": "Code must be a number",
    "number.integer": "Code must be a whole number",
    "number.min": "Code must be 4 digits",
    "number.max": "Code must be 4 digits",
    "any.required": "Code is required",
  }),
  newPassword: joi
    .string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "New password is required",
    }),
  reNewPassword: joi.string().valid(joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
    "string.empty": "Confirm password is required",
  }),
});

const changePasswordSchema = joi.object({
  password: joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: joi
    .string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "Password is required",
    }),
  reNewPassword: joi
    .string()
    .valid(joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "string.empty": "Confirm password is required",
    }),
});

export {
  userSchemaCreate,
  userSchemaLogin,
  userSchemaUpdate,
  forgetPasswordSchema,
  changePasswordSchema,
};
