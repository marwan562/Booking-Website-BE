import { createLogger, format, transports } from "winston";
import path from "path";
import { dirname } from "./getDirName.js";

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}]: ${message}`
    )
  ),
  transports: [
    new transports.File({
      filename: path.join(dirname, "../server.log"),
      maxsize: 1048576,
      maxFiles: 5,
    }),
  ],
});

export default logger;
