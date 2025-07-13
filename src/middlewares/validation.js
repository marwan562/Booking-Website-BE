import { AppError } from "../utilities/AppError.js";

export const validation = (schema) => {
  return (req, res, next) => {
    const input = { ...req.body, ...req.params, ...req.query };
    const { error } = schema.validate(input, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return next(new AppError(errors.join(", "), 400));
    }
    next();
  };
};
