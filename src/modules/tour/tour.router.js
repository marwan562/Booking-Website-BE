import { Router } from "express";
import * as Tour from "./tour.controller.js";
import { allowedTo, auth } from "../../middlewares/auth.js";
import { uploadMixfile } from "../../middlewares/fileUpload.js";
import { saveImg } from "../../middlewares/uploadToCloud.js";
import { validation } from "../../middlewares/validation.js";
import { createTourSchema, updatedTourSchema } from "./tour.validation.js";
import { parseJsonFields } from "../../middlewares/parseJsonFieldsMiddleware.js";
const tourRouter = Router();

tourRouter.route("/order").patch(auth, Tour.orderTour);

tourRouter.route("/by-id/:id").get(Tour.getTourById);

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
    parseJsonFields,
    validation(createTourSchema),
    Tour.createTour
  )
  .delete(auth, allowedTo("admin"), Tour.deleteAllTour);

tourRouter.route("/search", Tour.searchTours);
tourRouter.route("/categories").get(Tour.getCategories);

tourRouter.route("/:slug").get(Tour.getTourBySlug);

tourRouter
  .route("/:id")
  .delete(auth, allowedTo("admin"), Tour.deleteTour)
  .patch(
    auth,
    allowedTo("admin"),
    uploadMixfile([
      { name: "mainImg", maxCount: 1 },
      { name: "images", maxCount: 10 },
    ]),
    saveImg,
    parseJsonFields,
    validation(updatedTourSchema),
    Tour.updateTour
  );

tourRouter.route("/:id/apply-coupon").post(Tour.checkCoupon);

tourRouter.route("/get-all/admin", auth, allowedTo("admin")).get(Tour.getAllTourForAdmin);


export default tourRouter;
