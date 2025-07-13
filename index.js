import express from "express";
import morgan from "morgan";
import cors from "cors";
import customErrorHandler from "./middlewares/customErrorHandler.js";
import dbConnection from "./DataBase/DbConnection.js";
import router from "./src/index.router.js";
import { 
    securityHeaders, 
    sanitizeData, 
    corsOptions, 
    requestSizeLimit,
    ipBlocker,
    requestLogger,
    apiLimiter 
} from "./middlewares/security.js";
import { AppError } from "./utilities/AppError.js";
import "dotenv/config";

const app = express();

console.log("cloudinary",process.env.CLOUDINARY_NAME)
// Connect to database
dbConnection();

// Security middleware (order matters!)
app.use(securityHeaders);
app.use(sanitizeData);
app.use(ipBlocker);
app.use(requestLogger);

// CORS configuration
app.use(cors(corsOptions));

// Request parsing with size limits
app.use(express.json(requestSizeLimit));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Global rate limiting
app.use('/api', apiLimiter);

// Routes
app.use("/api", router);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// 404 handler
app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(customErrorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});