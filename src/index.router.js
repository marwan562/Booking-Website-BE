import paymentRouter from "./modules/payment/payment.router.js";
import subscriptionRouter from "./modules/subscription/subscription.router.js";
import tourRouter from "./modules/tour/tour.router.js";
import userRouter from "./modules/user/user.router.js";
import testimonialRouter from "./modules/testimonial/testimonial.router.js";
import reviewRouter from "./modules/review/review.router.js";
import { AppError } from "../utilities/AppError.js";


function init(app) {
  app.use("/api/user", userRouter);
  app.use("/api/tour", tourRouter);
  app.use("/api/payment", paymentRouter);
  app.use("/api/subscription", subscriptionRouter);
  app.use("/api/testimonial", testimonialRouter);
  app.use("/api/review", reviewRouter);

  app.all("*", (req, res, next) => {
    next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
  });
}

export default init;
