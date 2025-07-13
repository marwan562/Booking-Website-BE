import { Router } from "express";
import {
  addToWishList,
  authentication,
  authorization,
  changePassword,
  checkCode,
  forgetPassword,
  getAllUsers,
  getUserById,
  getUserProfile,
  getWishlist,
  login,
  register,
  removeFromWishList,
  sendCode,
  updateUserProfile,
  refreshToken,
} from "./user.controller.js";
import {
  forgetPasswordSchema,
  userSchemaLogin,
  userSchemaUpdate,
  changePasswordSchema,
  userSchemaCreate,
} from "./user.validation.js";
import { allowedTo, auth } from "../../middlewares/auth.js";
import { validation } from "../../middlewares/validation.js";
import { saveImg } from "../../middlewares/uploadToCloud.js";
import { uploadMixfile } from "../../middlewares/fileUpload.js";
import {
  registerLimiter,
  loginLimiter,
  strictLimiter,
} from "../../middlewares/security.js";

const userRouter = Router();

// Public routes with rate limiting
userRouter
  .route("/register")
  .post(
    registerLimiter,
    uploadMixfile([{ name: "avatar", maxCount: 1 }]),
    saveImg,
    validation(userSchemaCreate),
    register
  );

userRouter
  .route("/login")
  .post(loginLimiter, validation(userSchemaLogin), login);

userRouter.route("/refreshToken").get(strictLimiter, refreshToken);

userRouter.route("/sendCode").put(strictLimiter, sendCode);

userRouter.route("/checkCode").put(strictLimiter, checkCode);

userRouter
  .route("/forgetPassword")
  .patch(strictLimiter, validation(forgetPasswordSchema), forgetPassword);

// Protected routes
userRouter.route("/wishlist").get(auth, getWishlist);

userRouter.route("/profile").get(auth, getUserProfile);

userRouter.route("/authentication").get(auth, authentication);

userRouter.route("/authorization").get(auth, authorization);

userRouter
  .route("/changePassword")
  .patch(auth, validation(changePasswordSchema), changePassword);

userRouter.route("/addToWishlist/:id").patch(auth, addToWishList);

userRouter.route("/removeWishlist/:id").patch(auth, removeFromWishList);

// Admin only routes
userRouter
  .route("/")
  .get(auth, allowedTo("admin"), getAllUsers)
  .patch(
    auth,
    uploadMixfile([{ name: "avatar", maxCount: 1 }]),
    saveImg,
    validation(userSchemaUpdate),
    updateUserProfile
  );

userRouter.route("/:id").get(auth, allowedTo("admin"), getUserById);

export default userRouter;
