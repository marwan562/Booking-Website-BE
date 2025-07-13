import { AppError } from "../utilities/AppError.js";

export const validation = (schema) => {
  return (req, _, next) => {
    let input = { ...req.body, ...req.params, ...req.query };
    let { error } = schema.validate(input, { abortEarly: false });
    if (error) {
      let errors = error.details.map((detail) => detail.message);
      return next(new AppError(errors));
    }
    next();
  };
};
