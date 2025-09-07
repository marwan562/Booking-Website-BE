import { hash } from "bcrypt";
import userModel from "../../models/userModel.js";
import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { removeImage } from "../../middlewares/deleteImg.js";
import sendEmail from "../../utilities/Emails/sendEmail.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import jwt from "jsonwebtoken";
import tourModel from "../../models/tourModel.js";
import { AppError } from "../../utilities/AppError.js";

const checkEmail = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError("Email is required", 400));
  const user = await userModel.findOne({ email });
  if (user)
    return res
      .status(200)
      .send({ message: "Email is already in use", isEmail: true });
  res.status(200).send({ message: "Email is not in use", isEmail: false });
});

const verifyUser = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  jwt.verify(
    token,
    process.env.VERIFICATION_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) return next(new AppError("Invalid token please try again", 400));

      const { id } = decoded;
      const user = await userModel.findOne({ _id: id });

      if (user.verified)
        return next(new AppError("User already verified", 200));

      user.verified = true;
      await user.save();

      // refreshToken in HttpOnly cookie
      const accessToken = await user.generateAccessToken();
      const refreshToken = await user.generateRefreshToken();

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).send({
        status: "success",
        data: {
          user,
          accessToken,
        },
      });
    }
  );
});

const register = catchAsyncError(async (req, res, next) => {
  const {
    name,
    email,
    password,
    rePassword,
    age,
    nationality,
    avatar,
    phone,
    gender,
  } = req.body;

  if (password !== rePassword) {
    return next(new AppError("Passwords do not match!", 400));
  }

  const exists = await userModel.findOne({ email });
  if (exists) return next(new AppError("User already exists", 400));

  const user = await userModel.create({
    name,
    email,
    password,
    age,
    nationality,
    avatar,
    phone,
    gender,
  });

  const accessToken = await user.generateVerificationToken();

  sendEmail({ email, id: accessToken });

  res.status(201).json({
    status: "success",
    message: "Please check your email to verify your account",
  });
});

const getAllUsers = catchAsyncError(async (req, res, next) => {
  const apiFeature = new ApiFeature(userModel.find(), req.query)
    .paginate()
    .fields()
    .filter()
    .sort()
    .search()
    .lean();

  const result = await apiFeature.mongoseQuery;

  const totalCount = await apiFeature.getTotalCount();
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);

  if (!result) {
    return next(new AppError("Can't find users", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      users: result,
      pagination: paginationMeta,
    },
  });
});

const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("Invalid email or password", 401));
  }
  if (!user.verified) {
    const accessToken = await user.generateVerificationToken();
    await sendEmail({ email, id: accessToken });
    return next(new AppError("Please verify your account", 401));
  }

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    status: "success",
    data: {
      user,
      accessToken,
    },
  });
});

const refreshToken = catchAsyncError(async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) return next(new AppError("Refresh token missing", 401));

  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
    if (err) return next(new AppError("Invalid refresh token", 401));

    const user = await userModel.findById(decoded.id);
    if (!user) return next(new AppError("User not found", 401));

    const accessToken = await user.generateAccessToken();

    return res.status(200).json({ message: "success", accessToken });
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
  const user = await userModel.findByIdAndUpdate(_id, req.body);
  removeImage(user.avatar.public_id);
  res.status(200).send({ message: "success", data: user });
});

const addToWishList = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { id } = req.params;
  const tour = await tourModel.findById(id);

  if (!tour) return next(new AppError("Tour not found!", 404));

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
    })
    .lean();

  if (!user) return next(new AppError("User not found!", 404));

  res.status(200).send({ message: "success", data: user.wishList });
});

const removeFromWishList = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { id } = req.params;

  const tour = await tourModel.findById(id);
  if (!tour) return next(new AppError("Tour not found!", 404));

  const user = await userModel.findById(_id).select("wishList");
  if (!user) return next(new AppError("User not found!", 404));

  const isInWishlist = user.wishList.some((wishId) => wishId.toString() === id);
  if (!isInWishlist) return next(new AppError("Tour is not in wishlist", 400));

  const updatedUser = await userModel
    .findByIdAndUpdate(
      _id,
      {
        $pull: { wishList: id },
      },
      { new: true }
    )
    .populate({
      path: "wishList",
      select: "title description mainImg adultPricing",
    })
    .lean();

  res.status(200).send({ message: "success", data: updatedUser.wishList });
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
  res.status(200).send({ message: "success", data: user.wishList });
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
  const user = await userModel.findOne({ email });

  if (!user) {
    return next(new AppError("User not found!"));
  }

  const randomCode = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
  const code = randomCode.toString();
  user.code = code;
  await user.save();
  sendEmail({ email, code });
  res.status(200).send({ message: "success" });
});

const checkCode = catchAsyncError(async (req, res, next) => {
  const { code, email } = req.body;
  const result = await userModel.findOne({ email, code }).select("+code");
  if (!result || result.code !== code) {
    return next(new AppError("Incorrect email or code", 400));
  }
  res.status(200).send({ message: "success", data: "correct code" });
});
const forgetPassword = catchAsyncError(async (req, res, next) => {
  const { email, code, newPassword, reNewPassword } = req.body;
  console.log("forget password", newPassword, reNewPassword);
  if (newPassword !== reNewPassword) {
    return next(new AppError("Passwords do not match!", 400));
  }

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
  const user = await userModel.findById(_id).select("+password");
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
  checkEmail,
  verifyUser,
};
