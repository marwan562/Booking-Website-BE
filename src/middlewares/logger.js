import logger from "../utilities/logger.js";

// Express middleware for logging each request
const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
};

export default requestLogger;
