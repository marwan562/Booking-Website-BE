import { Router } from "express";
import * as Destination from "./destination.controller.js";
import { allowedTo, auth } from "../../middlewares/auth.js";
import { uploadMixfile } from "../../middlewares/fileUpload.js";
import { saveImg } from "../../middlewares/uploadToCloud.js";
import { validation } from "../../middlewares/validation.js";
import {
  createDestinationSchema,
  updatedDestinationSchema,
} from "./destination.validation.js";
import { parseJsonFields } from "../../middlewares/parseJsonFieldsMiddleware.js";
import cacheMiddleware from "../../middlewares/cacheMiddleware.js";
import { clearCacheMiddleware } from "../../utilities/cacheUtils.js";

const destinationRouter = Router();
const DESTINATION_CACHE_PATTERN = "cache:/destination*";

destinationRouter.route("/popular").get(cacheMiddleware(), Destination.getPopularDestinations);
destinationRouter.route("/search").get(cacheMiddleware(), Destination.searchDestinations);

destinationRouter
  .route("/")
  .get(cacheMiddleware(), Destination.getAllDestinations)
  .post(
    auth,
    allowedTo("admin"),
    uploadMixfile([{ name: "mainImg", maxCount: 1 }]),
    saveImg,
    parseJsonFields,
    validation(createDestinationSchema),
    clearCacheMiddleware(DESTINATION_CACHE_PATTERN),
    Destination.createDestination
  )
  .delete(auth, allowedTo("admin"), clearCacheMiddleware(DESTINATION_CACHE_PATTERN), Destination.deleteAllDestinations);

destinationRouter.route("/:destination").get(cacheMiddleware(), Destination.getDestination);

destinationRouter
  .route("/:id")
  .delete(auth, allowedTo("admin"), clearCacheMiddleware(DESTINATION_CACHE_PATTERN), Destination.deleteDestination)
  .patch(
    auth,
    allowedTo("admin"),
    uploadMixfile([{ name: "mainImg", maxCount: 1 }]),
    saveImg,
    parseJsonFields,
    validation(updatedDestinationSchema),
    clearCacheMiddleware(DESTINATION_CACHE_PATTERN),
    Destination.updateDestination
  );

destinationRouter
  .route("/:id/tours")
  .get(cacheMiddleware(), Destination.getDestinationTours);
destinationRouter.route("/:id/stats").get(cacheMiddleware(), Destination.getDestinationStats);
destinationRouter
  .route("/category/:category")
  .get(cacheMiddleware(), Destination.getDestinationsByCategory);

export default destinationRouter;
