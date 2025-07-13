import express from "express";
import morgan from "morgan";
import cors from "cors";
import customErrorHandler from "./DataBase/index.js";
import dbConnection from "./DataBase/index.js";
import router from "./src/router/index.js";
import {
  securityHeaders,
  sanitizeData,
  corsOptions,
  requestSizeLimit,
  apiLimiter,
} from "./src/middlewares/security.js";
import { AppError } from "./src/utilities/AppError.js";
import { dirname } from "./src/utilities/getDirName.js";
import dotenv from "dotenv";

dotenv.config({ path: `${dirname}/.env` });

const app = express();

console.log("Loaded ENV:", process.env.NODE_ENV);

// Connect to database
dbConnection();

// Security middleware (order matters!)
app.use(securityHeaders);
app.use(sanitizeData);

// CORS configuration
app.use(cors(corsOptions));

// Request parsing with size limits
app.use(express.json(requestSizeLimit));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Global rate limiting
app.use("/api", apiLimiter);

// Routes
app.use("/api", router);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// 404 handler
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(customErrorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
