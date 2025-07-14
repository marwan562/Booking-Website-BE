import { Router } from "express";
import { allowedTo, auth } from "../../middlewares/auth.js";
import {
  createSubscription,
  getAllSubscription,
  getSubscriptionById,
  deleteSubscription
} from "./subscription.controller.js";
import { validation } from "../../middlewares/validation.js";
import { subscriptionSchema } from "./subscription.validation.js";
const subscriptionRouter = Router();

subscriptionRouter
  .route("/:id")
  .post(auth, validation(subscriptionSchema), createSubscription)
  .get(auth, getSubscriptionById)
  .delete(auth, allowedTo("admin"), deleteSubscription)
  
subscriptionRouter.route("/").get(auth, getAllSubscription);

export default subscriptionRouter;
