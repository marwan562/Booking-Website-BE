import { Router } from "express";
import * as Tour from "./tour.controller.js";
import { allowedTo, auth } from "../../middlewares/auth.js";
import { uploadMixfile } from "../../middlewares/fileUpload.js";
import { saveImg } from "../../middlewares/uploadToCloud.js";
import { validation } from "../../middlewares/validation.js";
import { createTourSchema, updatedTourSchema } from "./tour.validation.js";
const tourRouter = Router();

tourRouter.route("/order").patch(auth, Tour.orderTour);

tourRouter
  .route("/")
  .get(Tour.getAllTour)
  .post(
    auth,
    allowedTo("admin"),
    uploadMixfile([
      { name: "mainImg", maxCount: 1 },
      { name: "images", maxCount: 10 },
    ]),
    saveImg,
    validation(createTourSchema),
    Tour.createTour
  )
  .delete(auth, allowedTo("admin"), Tour.deleteAllTour);

tourRouter.route("/search", Tour.searchTours);
tourRouter.route("/categories").get(Tour.getCategories);

tourRouter
  .get(tourRouter.get("/:slug", Tour.getTourBySlug))
  .get(Tour.getTourById)
  .delete(auth, allowedTo("admin"), Tour.deleteTour)
  .patch(
    auth,
    allowedTo("admin"),
    uploadMixfile([
      { name: "mainImg", maxCount: 1 },
      { name: "images", maxCount: 10 },
    ]),
    saveImg,
    validation(updatedTourSchema),
    Tour.updateTour
  );

export default tourRouter;
