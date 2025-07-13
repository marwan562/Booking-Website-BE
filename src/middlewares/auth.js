import userModel from "../models/userModel.js";
import { AppError } from "../utilities/AppError.js";
import { catchAsyncError } from "./catchAsyncError.js";
import jwt from "jsonwebtoken";

export const auth = catchAsyncError(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return next(new AppError("Authorization token not provided", 401));

  const token = authHeader.split(" ")[1]; // Get the token

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return next(new AppError(`Invalid token: ${err.message}`, 401));

    const { id } = decoded;
    const user = await userModel.findById(id);

    if (!user) return next(new AppError("User is not authorized", 401));

    req.user = user;
    next();
  });
});

export const allowedTo = (...role) => {
  return catchAsyncError(async (req, res, next) => {
    if (!role.includes(req.user.role))
      return next(
        new AppError(`you are not authorized you are ${req.user.role}`, 401)
      );

    next();
  });
};
