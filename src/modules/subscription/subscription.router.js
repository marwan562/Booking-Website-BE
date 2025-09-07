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
} from "./subscription.controller.js";
import { validation } from "../../middlewares/validation.js";
import {
  subscriptionSchema,
  updateCartSchema,
} from "./subscription.validation.js";
const subscriptionRouter = Router();

subscriptionRouter.route("/cart").get(auth, getAllCart);
subscriptionRouter
  .route("/cart/:id")
  .patch(auth, validation(updateCartSchema), updateTourInCart)
  .delete(auth, deleteTourFromCart);
subscriptionRouter.route("/clear").delete(auth, deleteAllToursInCart);

subscriptionRouter
  .route("/personal-details")
  .put(auth, updateToursWithPersonalDetails);

subscriptionRouter
  .route("/:id")
  .post(auth, validation(subscriptionSchema), createSubscription)
  .get(auth, getSubscriptionById)
  .delete(auth, allowedTo("admin"), deleteSubscription);

subscriptionRouter.route("/").get(auth, getAllSubscription);

export default subscriptionRouter;
