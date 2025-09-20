import { Router } from "express";
import { allowedTo, auth } from "../../middlewares/auth.js";
import {
  createSubscription,
  getAllSubscription,
  getSubscriptionById,
  deleteSubscription,
  getAllCart,
  deleteTourFromCart,
  deleteAllToursInCart,
  updateTourInCart,
  updateToursWithPersonalDetails,
  upcomingBookings,
  getSubscriptionsByRefs,
} from "./subscription.controller.js";
import { validation } from "../../middlewares/validation.js";
import {
  subscriptionSchema,
  updateCartSchema,
} from "./subscription.validation.js";
import multer from "multer";
import { saveImg, saveImgPassport } from "../../middlewares/uploadToCloud.js";
import { clearPrefix } from "../../middlewares/clear-prefix.js";

const upload = multer({ storage: multer.memoryStorage() });

const subscriptionRouter = Router();

subscriptionRouter.route("/by-refs").get(auth, getSubscriptionsByRefs);

subscriptionRouter.route("/cart").get(auth, getAllCart);
subscriptionRouter
  .route("/cart/:id")
  .patch(auth, validation(updateCartSchema), updateTourInCart)
  .delete(auth, deleteTourFromCart);
subscriptionRouter.route("/clear").delete(auth, deleteAllToursInCart);

subscriptionRouter.route("/upcoming-bookings").get(auth, upcomingBookings);

subscriptionRouter
  .route("/personal-details")
  .put(auth, updateToursWithPersonalDetails);

subscriptionRouter
  .route("/:id")
  .post(
    upload.any(),
    clearPrefix,
    auth,
    saveImgPassport,
    validation(subscriptionSchema),
    createSubscription
  )
  .get(auth, getSubscriptionById)
  .delete(auth, allowedTo("admin"), deleteSubscription);

subscriptionRouter.route("/").get(auth, getAllSubscription);

export default subscriptionRouter;
