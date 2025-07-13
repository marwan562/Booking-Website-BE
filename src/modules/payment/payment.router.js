import express from "express";
import { auth } from "../../middlewares/auth.js";
import {

  fwaterk,
  handleFaildPayment,
  handlePendingPayment,
  handleSuccessPayment,
} from "./payment.controller.js";
const paymentRouter = express.Router();

paymentRouter.post("/checkout-session/:id", auth, fwaterk);
// paymentRouter.post("/complete-order", completeOrder);
paymentRouter.get("/handelPassCheckout/:token", handleSuccessPayment);
paymentRouter.get("/handelPendingPass/:token", handlePendingPayment);
paymentRouter.get("/handelFaildPass/:token", handleFaildPayment);
// paymentRouter.post("/fwaterk/:id", auth, fwaterk);
export default paymentRouter;
