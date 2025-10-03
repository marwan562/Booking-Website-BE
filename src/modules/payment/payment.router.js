import express from "express";
import { auth } from "../../middlewares/auth.js";
import { validation } from "../../middlewares/validation.js";
import { fwaterkSchema, refundSchema } from "./payment.validation.js";
import {
  fwaterk,
  handleFaildPayment,
  handlePendingPayment,
  handleSuccessPayment,
  stripeSessionCompleted,
  stripeRefundPayment
} from "./payment.controller.js";

const paymentRouter = express.Router();

paymentRouter.post(
  "/checkout-session/:id",
  auth,
  validation(fwaterkSchema),
  fwaterk
);
// paymentRouter.post("/complete-order", completeOrder);
paymentRouter.get("/handelPassCheckout/:token", handleSuccessPayment);
paymentRouter.get("/handelPendingPass/:token", handlePendingPayment);
paymentRouter.get("/handelFaildPass/:token", handleFaildPayment);
// paymentRouter.post("/fwaterk/:id", auth, fwaterk);

paymentRouter.post("/", stripeSessionCompleted);
paymentRouter.post(
  "/refund",
  auth,
  validation(refundSchema),
  stripeRefundPayment
);

export default paymentRouter;
