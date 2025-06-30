import userModel from "../DataBase/models/userModel.js";
import { AppError } from "../utilities/AppError.js";
import { catchAsyncError } from "./catchAsyncError.js";
import jwt, { decode } from "jsonwebtoken";
export const auth = catchAsyncError(async (req, res, next) => {
  const { token } = req.headers;
  if (!token) return next(new AppError("token nor provider", 401));
  jwt.verify(token, process.env.JWT_SECRET, async function (err, decoded) {
    if (err) return next(new AppError(err.message));
    const { id } = decoded;
    const user = await userModel.findById(id).select("-password");
    if (!user) return next(new AppError("user not authorized", 401));

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
