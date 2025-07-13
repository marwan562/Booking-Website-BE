import logger from "../../logs/logger.js";

const customErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error("Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = new AppError(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = new AppError(message, 401);
  }

  let statusCode = error.statusCode || 500,
    message = error.message || "Internal Server Error";

  // Don't leak error details in production
  const response = {
    status: "error",
    message,
    ...(process.env.NODE_ENV === "development" && {
      stack: process.env.NODE_ENV === "development" ? err.stack : null,
      error: err,
    }),
  };

  logger.error(`${req.method} ${req.url} - ${err.message}`);
  res.status(statusCode).json(response);
};

export default customErrorHandler;
