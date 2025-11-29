import express from "express";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import dbConnection from "./DataBase/index.js";
import router from "./src/router/index.js";
import {
  securityHeaders,
  sanitizeData,
  requestSizeLimit,
} from "./src/middlewares/security.js";
import logger from "./logs/logger.js";
import { AppError } from "./src/utilities/AppError.js";
import customErrorHandler from "./src/middlewares/customErrorHandler.js";
import { stripeSessionCompleted } from "./src/modules/payment/payment.controller.js";
import paymentRouter from "./src/modules/payment/payment.router.js";
import cors from "cors";
import "dotenv/config";

const app = express();

// Connect to database
try {
  dbConnection();
  logger.info("Database connection established");
} catch (err) {
  logger.error(`Database connection failed: ${err.message}`);
}

app.post(
  "/payment/webhook",
  express.raw({ type: "application/json" }),
  stripeSessionCompleted
);

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Security middleware
app.use(securityHeaders);
app.use(sanitizeData);

// CORS configuration
if (process.env.NODE_ENV === "development") {
  app.use(cors());
}

app.use(cookieParser());

app.use(express.json(requestSizeLimit));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
const stream = {
  write: (message) => logger.info(message.trim()),
};

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", { stream }));
}

// Routes
app.use("/payment", paymentRouter);
app.use("/", router);

app.get("/health", (_, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.all("*", (req, _, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(customErrorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`Server is running on port ${PORT}`);
});