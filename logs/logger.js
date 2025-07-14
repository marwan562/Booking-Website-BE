import { createLogger, format, transports } from "winston";
import path from "path";
import { dirname } from "../src/utilities/getDirName.js";

// Custom format for better performance
const customFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.json(),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Production format (more compact)
const productionFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: process.env.NODE_ENV === "production" ? productionFormat : customFormat,
  transports: [
    // File transport with rotation
    new transports.File({
      filename: path.join(dirname, "../../logs/server.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
      zippedArchive: true, // Compress old log files
      format: process.env.NODE_ENV === "production" ? productionFormat : customFormat
    }),
    
    // Error log file
    new transports.File({
      filename: path.join(dirname, "../../logs/error.log"),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
      zippedArchive: true,
      format: process.env.NODE_ENV === "production" ? productionFormat : customFormat
    }),
    
    // Performance log file
    new transports.File({
      filename: path.join(dirname, "../../logs/performance.log"),
      level: 'warn',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
      tailable: true,
      zippedArchive: true,
      format: process.env.NODE_ENV === "production" ? productionFormat : customFormat
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new transports.File({
      filename: path.join(dirname, "../../logs/exceptions.log"),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
      zippedArchive: true
    })
  ],
  
  rejectionHandlers: [
    new transports.File({
      filename: path.join(dirname, "../../logs/rejections.log"),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
      zippedArchive: true
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== "production") {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple(),
      format.printf(({ timestamp, level, message, stack }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (stack) {
          log += `\n${stack}`;
        }
        return log;
      })
    )
  }));
}

// Performance optimization: Buffer logs in production
if (process.env.NODE_ENV === "production") {
  logger.transports.forEach(transport => {
    if (transport.filename) {
      transport.silent = false;
      transport.handleExceptions = true;
      transport.handleRejections = true;
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing logger');
  logger.close();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing logger');
  logger.close();
});

export default logger;
