import express from "express";
import {
  getOverviewStats,
  getRevenueTimeline,
  getBookingsByStatus,
  getUserGrowth,
  getTopTours,
  getTopDestinations,
  getSubscriptionMetrics,
  getCategoryDistribution,
  getDashboard,
} from "./analysis.controller.js";
import { allowedTo, auth } from "../../middlewares/auth.js";

const router = express.Router();

router.use(auth, allowedTo("admin"));

router.get("/overview", getOverviewStats);
router.get("/revenue-timeline", getRevenueTimeline);
router.get("/bookings-status", getBookingsByStatus);
router.get("/user-growth", getUserGrowth);
router.get("/top-tours", getTopTours);
router.get("/top-destinations", getTopDestinations);
router.get("/subscription-metrics", getSubscriptionMetrics);
router.get("/category-distribution", getCategoryDistribution);

router.get("/dashboard", getDashboard);

export default router;
