import { BlogController } from "./blog-public.controller.js";
import { AdminController } from "./blog.controller.js";
import { auth, allowedTo } from "../../middlewares/auth.js";
import { blogValidation } from "./blog.validation.js";
import { uploadMixfile } from "../../middlewares/fileUpload.js";
import { saveImg } from "../../middlewares/uploadToCloud.js";
import express from "express";

const router = express.Router();
const blogController = new BlogController();
const adminController = new AdminController();

router.get("/admin", adminController.getAllBlogs);
router.get("/admin/stats", adminController.getBlogStats);
router.post(
  "/admin",
  auth,
  allowedTo("admin"),
  uploadMixfile([{ name: "image", maxCount: 1 }]),
  saveImg,
  adminController.createBlog
);
router.put("/admin/:id", auth, allowedTo("admin"), adminController.updateBlog);
router.delete("/admin/:id", auth, allowedTo("admin"), adminController.deleteBlog);
router.patch("/admin/:id/featured", auth, allowedTo("admin"), adminController.toggleFeatured);
router.patch("/admin/:id/trending", auth, allowedTo("admin"), adminController.toggleTrending);
router.post("/admin/bulk", adminController.bulkUpdate);

// Static public routes (these should come before /:slug as well)
router.get("/", blogController.getAllBlogs);
router.get("/featured", blogController.getFeaturedBlogs);
router.get("/trending", blogController.getTrendingBlogs);
router.get("/categories", blogController.getCategories);
router.get("/category/:category", blogController.getBlogsByCategory);

// Dynamic routes MUST be last
router.get("/:slug", blogController.getBlogBySlug);
router.post("/:id/like", blogController.likeBlog);

export default router;