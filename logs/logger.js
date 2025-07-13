import { createLogger, format, transports } from "winston";
import path from "path";
import { dirname } from "../src/utilities/getDirName.js";

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
      filename: path.join(dirname, "../../logs/server.log"),
      maxsize: 1048576,
      maxFiles: 5,
    }),
  ],
});

console.log(dirname)

export default logger;
