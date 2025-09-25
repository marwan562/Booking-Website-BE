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

const destinationRouter = Router();

destinationRouter.route("/popular").get(Destination.getPopularDestinations);
destinationRouter.route("/search").get(Destination.searchDestinations);

destinationRouter
  .route("/")
  .get(Destination.getAllDestinations)
  .post(
    auth,
    allowedTo("admin"),
    uploadMixfile([{ name: "mainImg", maxCount: 1 }]),
    saveImg,
    parseJsonFields,
    validation(createDestinationSchema),
    Destination.createDestination
  )
  .delete(auth, allowedTo("admin"), Destination.deleteAllDestinations);

destinationRouter.route("/:destination").get(Destination.getDestination);

destinationRouter
  .route("/:id")
  .delete(auth, allowedTo("admin"), Destination.deleteDestination)
  .patch(
    auth,
    allowedTo("admin"),
    uploadMixfile([{ name: "mainImg", maxCount: 1 }]),
    saveImg,
    parseJsonFields,
    validation(updatedDestinationSchema),
    Destination.updateDestination
  );

destinationRouter
  .route("/:id/tours")
  .get(Destination.getDestinationTours);
destinationRouter.route("/:id/stats").get(Destination.getDestinationStats);
destinationRouter
  .route("/category/:category")
  .get(Destination.getDestinationsByCategory);

export default destinationRouter;
