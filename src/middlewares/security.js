import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import "dotenv/config"

// Rate limiting for login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    status: "error",
    statusCode: 429,
    message:
      "Too many login attempts from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Use email + IP for more granular rate limiting
    return `${req.body.email || req.ip}-${req.ip}`;
  },
});

// Register rate limiting
export const registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 5 requests per windowMs
  message: {
    status: "error",
    statusCode: 429,
    message:
      "Too many authentication attempts detected. Please try again in a few minutes to protect your account.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 40, // limit each IP to 10 requests per windowMs
  message: {
    status: "error",
    statusCode: 429,
    message: "Too many requests for this operation, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

export const sanitizeData = [
  mongoSanitize(), // Prevent NoSQL injection
  xss(), // Prevent XSS attacks
  hpp(), // Prevent HTTP Parameter Pollution
];

// CORS configuration
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [process.env.FRONT_END_URL];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "token",
    "X-Requested-With",
  ],
};

// Request size limiting
export const requestSizeLimit = {
  limit: "10mb",
  extended: true,
  parameterLimit: 1000,
  message: {
    status: "error",
    statusCode: 429,
    message: "Request entity too large",
  },
};
