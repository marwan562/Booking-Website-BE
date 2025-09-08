import { Router } from "express";
import * as User from "./user.controller.js";
import * as UserValidation from "./user.validation.js";
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
userRouter.route("/check-user-email").post(registerLimiter, User.checkEmail);

userRouter
  .route("/register")
  .post(
    registerLimiter,
    uploadMixfile([{ name: "avatar", maxCount: 1 }]),
    saveImg,
    validation(UserValidation.userSchemaCreate),
    User.register
  );

userRouter.route("/verifyEmail/:token").get(strictLimiter, User.verifyUser);

userRouter
  .route("/login")
  .post(validation(UserValidation.userSchemaLogin), User.login);

userRouter.route("/refreshToken").get(strictLimiter, User.refreshToken);

userRouter.route("/sendCode").post(strictLimiter, User.sendCode);

userRouter.route("/checkCode").put(strictLimiter, User.checkCode);

userRouter
  .route("/forgetPassword")
  .patch(
    strictLimiter,
    validation(UserValidation.forgetPasswordSchema),
    User.forgetPassword
  );

// Protected routes
userRouter.route("/wishlist").get(auth, User.getWishlist);

userRouter
  .route("/profile")
  .get(auth, User.getUserProfile)
  .patch(
    auth,
    uploadMixfile([{ name: "avatar", maxCount: 1 }]),
    saveImg,
    validation(UserValidation.userSchemaUpdate),
    User.updateUserProfile
  )

userRouter.route("/authentication").get(auth, User.authentication);

userRouter.route("/authorization").get(auth, User.authorization);

userRouter
  .route("/changePassword")
  .patch(
    auth,
    validation(UserValidation.changePasswordSchema),
    User.changePassword
  );

userRouter.route("/addToWishlist/:id").patch(auth, User.addToWishList);

userRouter.route("/removeWishlist/:id").patch(auth, User.removeFromWishList);

// Admin only routes
userRouter.route("/").get(auth, allowedTo("admin"), User.getAllUsers);

userRouter.route("/:id").get(auth, allowedTo("admin"), User.getUserById);

export default userRouter;
