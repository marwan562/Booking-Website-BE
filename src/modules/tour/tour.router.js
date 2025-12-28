import { Router } from "express";
import * as Tour from "./tour.controller.js";
import { allowedTo, auth } from "../../middlewares/auth.js";
import { uploadMixfile } from "../../middlewares/fileUpload.js";
import { saveImg } from "../../middlewares/uploadToCloud.js";
import { validation } from "../../middlewares/validation.js";
import { createTourSchema, updatedTourSchema } from "./tour.validation.js";
import { parseJsonFields } from "../../middlewares/parseJsonFieldsMiddleware.js";
import cacheMiddleware from "../../middlewares/cacheMiddleware.js";
import { clearCacheMiddleware } from "../../utilities/cacheUtils.js";
const tourRouter = Router();
const TOUR_CACHE_PATTERN = "cache:/tour*";

tourRouter.route("/order").patch(auth, Tour.orderTour);

tourRouter.route("/by-id/:id").get(cacheMiddleware(), Tour.getTourById);

tourRouter
  .route("/")
  .get(cacheMiddleware(), Tour.getAllTour)
  .post(
    auth,
    allowedTo("admin"),
    uploadMixfile([
      { name: "mainImg", maxCount: 1 },
      { name: "images", maxCount: 50 },
    ]),
    saveImg,
    parseJsonFields,
    validation(createTourSchema),
    clearCacheMiddleware(TOUR_CACHE_PATTERN),
    Tour.createTour
  )
  .delete(auth, allowedTo("admin"), clearCacheMiddleware(TOUR_CACHE_PATTERN), Tour.deleteAllTour);

tourRouter.route("/search", Tour.searchTours);
tourRouter.route("/categories").get(cacheMiddleware(), Tour.getCategories);

tourRouter.route("/:slug").get(cacheMiddleware(), Tour.getTourBySlug);

tourRouter
  .route("/:id")
  .delete(auth, allowedTo("admin"), clearCacheMiddleware(TOUR_CACHE_PATTERN), Tour.deleteTour)
  .patch(
    auth,
    allowedTo("admin"),
    uploadMixfile([
      { name: "mainImg", maxCount: 1 },
      { name: "images", maxCount: 50 },
    ]),
    saveImg,
    parseJsonFields,
    validation(updatedTourSchema),
    clearCacheMiddleware(TOUR_CACHE_PATTERN),
    Tour.updateTour
  );

tourRouter.route("/:id/apply-coupon").post(Tour.checkCoupon);

tourRouter.route("/get-all/admin", auth, allowedTo("admin")).get(Tour.getAllTourForAdmin);


export default tourRouter;
