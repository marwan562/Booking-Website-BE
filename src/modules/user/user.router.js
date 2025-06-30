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
} from "./user.controller.js";
import {
  forgetPasswordSchema,
  userSchemaLogin,
  userSchemaUpdate,
} from "./user.validation.js";
import { allowedTo, auth } from "../../../middlewares/auth.js";
import { validation } from "../../../middlewares/validation.js";
import { saveImg } from "../../../middlewares/uploadToCloud.js";
import { uploadMixfile } from "../../../middlewares/fileUpload.js";

const userRouter = Router();
userRouter.route("/wishlist").get(auth, getWishlist);
userRouter
  .route("/register")
  .post(uploadMixfile([{ name: "avatar", maxCount: 1 }]), saveImg, register);
userRouter.route("/login").post(validation(userSchemaLogin), login);
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
userRouter.route("/profile").get(auth, getUserProfile);
userRouter.route("/authentication").get(auth, authentication);
userRouter.route("/authorization").get(auth, authorization);
userRouter.route("/:id").get(auth, allowedTo("admin"), getUserById);
userRouter.route("/addToWishlist/:id").patch(auth, addToWishList);
userRouter.route("/removeWishlist/:id").patch(auth, removeFromWishList);
userRouter.route("/changePassword").patch(auth, changePassword);
userRouter.route("/sendCode").put(sendCode);
userRouter.route("/checkCode").put(checkCode);
userRouter
  .route("/forgetPassword")
  .patch(validation(forgetPasswordSchema), forgetPassword);

export default userRouter;
