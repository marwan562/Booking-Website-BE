import express from "express";
import subscriptionRouter from "../modules/subscription/subscription.router.js";
import tourRouter from "../modules/tour/tour.router.js";
import userRouter from "../modules/user/user.router.js";
import testimonialRouter from "../modules/testimonial/testimonial.router.js";
import reviewRouter from "../modules/review/review.router.js";
import paymentRouter from "../modules/payment/payment.router.js";
import destinationRouter from "../modules/destination/destination.router.js";
// import { generateFakeTours, generateSingleTestTour, getGenerationStats } from "../../development/controller/fake-tours-controller.js";

const router = express.Router();

router.use("/user", userRouter);
router.use("/destination", destinationRouter);
router.use("/tour", tourRouter);
router.use("/payment", paymentRouter);
router.use("/subscription", subscriptionRouter);
router.use("/testimonial", testimonialRouter);
router.use("/review", reviewRouter);

// router.post('/generate-tours', generateFakeTours);           // Generate multiple tours
// router.post('/generate-test-tour', generateSingleTestTour);  // Generate single tour
// router.get('/tour-stats', getGenerationStats);              // Get statistics

export default router;
