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
import paymentRouter from "./src/modules/payment/payment.router.js";
// import cors from "cors";
import "dotenv/config";

const app = express();

// Connect to database
try {
  dbConnection();
  logger.info("Database connection established");
} catch (err) {
  logger.error(`Database connection failed: ${err.message}`);
}

// Stripe webhook
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  paymentRouter
);

app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers["x-no-compression"]) {
        return false;
      }
      // Use compression for all other responses
      return compression.filter(req, res);
    },
  })
);

// Security middleware (order matters!)
app.use(securityHeaders);
app.use(sanitizeData);

// CORS configuration
// app.use(cors());

// Request parsing cookies
app.use(cookieParser());

// Request parsing with size limits
app.use(express.json(requestSizeLimit));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging with performance optimization
const stream = {
  write: (message) => logger.info(message.trim()),
};

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", { stream }));
}

// Routes
app.use("/api", router);

app.get("/health", (_, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// 404 handler
app.all("*", (req, _, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(customErrorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`Server is running on port ${PORT}`);
});
