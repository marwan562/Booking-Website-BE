import joi from "joi";

const userSchemaLogin = joi.object({
  email: joi
    .string()
    .pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/)
    .required(),
  password: joi
    .string()
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
    .required(),
});
const userSchemaCreate = joi.object({
  name: joi.string().min(2).max(15).required(),
  email: joi
    .string()
    .pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/)
    .required(),
  password: joi
    .string()
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
    .required(),
  rePassword: joi.ref("password"),
  avatar: joi.object({
    url: joi.string(),
    public_id: joi.string(),
  }),
  age: joi.number(),
  nationality: joi.string(),
  phone: joi.number(),
});
const userSchemaUpdate = joi.object({
  id: joi.string().hex().length(24),
  name: joi.string().min(2).max(15),
  email: joi
    .string()
    .pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/),
  password: joi.string().pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/),
  rePassword: joi.ref("password"),
  avatar: joi.object({
    url: joi.string(),
    public_id: joi.string(),
  }),
  age: joi.number(),
  nationality: joi.string(),
  phone: joi.number(),
});
const forgetPasswordSchema = joi.object({
  email: joi
    .string()
    .pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/)
    .required(),
  code: joi.number().integer().required(),
  newPassword: joi
    .string()
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
    .required(),
  reNewPassword: joi.ref("newPassword"),
});

export {
  userSchemaCreate,
  userSchemaLogin,
  userSchemaUpdate,
  forgetPasswordSchema,
};
