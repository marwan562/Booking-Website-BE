import { hash } from "bcrypt";
import userModel from "../../models/userModel.js";
import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { removeImage } from "../../middlewares/deleteImg.js";
import { AppError } from "../../utilities/AppError.js";
import sendEmail from "../../utilities/Emails/sendEmail.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import jwt from "jsonwebtoken";

const register = catchAsyncError(async (req, res, next) => {
  const { name, email, password, rePassword, age, nationality, phone, gender } =
    req.body;
  let user = null;
  // Fogot avatar, password, phone, age, nationality, gender
  user = await userModel.findOne({ email });
  if (user) return next(new AppError("User already exists", 400));

  user = new userModel({ name, password, phone, age, nationality, gender });
  await user.save();
  const token = await user.generateToken();
  res.status(201).json({
    status: "success",
    data: {
      user,
      token,
    },
  });
});

const getAllUsers = catchAsyncError(async (req, res, next) => {
  const apiFeature = new ApiFeature(userModel.find(), req.query)
    .paginate()
    .fields()
    .filter()
    .sort()
    .search();

  const result = await apiFeature.mongoseQuery;

  const count = await userModel.find().countDocuments();
  const pageNumber = Math.ceil(count / 10);

  if (!result) {
    return next(new AppError("Can't find users", 404));
  }

  res.status(200).json({
    status: "success",
    data: result,
    pageNumber,
    page: apiFeature.page,
  });
});

const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await userModel.findOne({ email });
  if (!user) {
    return next(new AppError("Invalid email or password", 401));
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(new AppError("Invalid email or password", 401));
  }
  const token = await user.generateToken();

  // Log successful login
  console.log(`Successful login: ${email} from IP: ${req.ip}`);

  res.status(200).json({
    status: "success",
    data: {
      user,
      token,
    },
  });
});

const refreshToken = catchAsyncError(async (req, res, next) => {
  const tokenHeader = req.headers.authorization;

  if (!tokenHeader || !tokenHeader.startsWith("Bearer "))
    return next(new AppError("Authorization token not provided", 401));

  const token = tokenHeader.split(" ")[1]; // Get the token

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return next(new AppError(`Invalid token: ${err.message}`, 401));
    const { id } = decoded;
    const user = await userModel.findById(id);

    if (!user) return next(new AppError("User is not authorized", 401));

    if (err.name === "TokenExpiredError") {
      const newToken = await user.generateToken();
      res.status(200).send({ message: "success", refreshToken: newToken });
    }
  });
});

const getUserById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findById(id);
  if (!user) {
    return next(new AppError("can't find user"));
  }
  res.status(200).send({ message: "success", data: user });
});

const updateUserProfile = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { avatar } = await userModel.findByIdAndUpdate(_id, req.body);
  removeImage(avatar.public_id);
  res.status(200).send({ message: "success" });
});

const addToWishList = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { id } = req.params;
  const user = await userModel
    .findByIdAndUpdate(
      _id,
      {
        $addToSet: { wishList: id }, // Corrected field name to wishList
      },
      { new: true }
    )
    .populate({
      path: "wishList",
      select: "title description mainImg adultPricing", // Corrected field name to description
    });
  !user && next(new AppError("can't find the tour"));
  res.status(200).send({ message: "success", data: user.wishList });
});

const removeFromWishList = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { id } = req.params;
  const user = await userModel
    .findByIdAndUpdate(
      _id,
      {
        $pull: { wishList: id },
      },
      { new: true }
    )
    .populate({
      path: "wishList",
      select: "title description mainImg adultPricing", // Corrected field name to description
      populate: {
        path: "createdBy",
        select: "-password",
      },
    })
    .lean();
  !user && next(new AppError("can't find the user"));
  res.status(200).send({ message: "success", data: user.wishList });
});

const getWishlist = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const user = await userModel.findById(_id).populate({
    path: "wishList",
    select: "mainImg title description adultPricing",
  });
  if (!user) {
    return next(new AppError("can't find user"));
  }
  if (!user.wishList[0]) {
    return next(new AppError("can't find any wishlist"));
  }
  res.status(200).send({ message: "success", data: user });
});
const authentication = catchAsyncError(async (req, res, next) => {
  res
    .status(200)
    .send({ message: "success", data: "Authentication successful" });
});
const authorization = catchAsyncError(async (req, res, next) => {
  const { role } = req.user;
  role == "user" && res.status(200).send({ message: "success", role: "user" });
  role == "admin" &&
    res.status(200).send({ message: "success", role: "admin" });
});
const sendCode = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;
  const randomCode = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
  const code = randomCode.toString();
  await userModel.findOneAndUpdate({ email: email }, { code });
  sendEmail({ email, code });
  res.status(200).send({ message: "success" });
});

const checkCode = catchAsyncError(async (req, res, next) => {
  const { code, email } = req.body;
  const result = await userModel.findOne({ email, code });
  if (!result) {
    return next(new AppError("correct email or code"));
  }
  res.status(200).send({ message: "success", data: "correct code" });
});
const forgetPassword = catchAsyncError(async (req, res, next) => {
  const { email, code, newPassword } = req.body;

  // Check if the provided email and code exist in the database
  const user = await userModel.findOneAndUpdate(
    { email, code },
    { password: await hash(newPassword, 10), $unset: { code: "" } }
  );
  if (!user) {
    return next(new AppError("Invalid email or code", 400));
  }

  res.status(200).send({ message: "Password reset successfully" });
});

const changePassword = catchAsyncError(async (req, res, next) => {
  const { newPassword, password } = req.body;
  const { _id } = req.user;
  const user = await userModel.findByIdAndUpdate(_id);
  if (!(await user.comparePassword(password))) {
    return next(new AppError("incorrect password"));
  }
  await userModel.findByIdAndUpdate(_id, {
    password: await hash(newPassword, 10),
  });
  res.status(200).send({ message: "success", data: "password changed" });
});
const getUserProfile = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const user = await userModel.findById(_id);
  if (!user) {
    return next(new AppError("can't find user"));
  }
  res.status(200).send({ message: "success", data: user });
});

export {
  login,
  register,
  getUserProfile,
  updateUserProfile,
  getUserById,
  getAllUsers,
  addToWishList,
  removeFromWishList,
  changePassword,
  sendCode,
  checkCode,
  forgetPassword,
  authentication,
  authorization,
  getWishlist,
  refreshToken,
};
