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

// ===== ADMIN ROUTES =====
// Basic CRUD operations
router.get("/admin", adminController.getAllBlogs);
router.get("/admin/:id/details", auth, allowedTo("admin"), adminController.getBlogById);
router.post(
  "/admin",
  auth,
  allowedTo("admin"),
  uploadMixfile([
    { name: "image", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 }
  ]),
  saveImg,
  adminController.createBlog
);
router.put(
  "/admin/:id",
  auth,
  allowedTo("admin"),
  uploadMixfile([
    { name: "image", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 }
  ]),
  saveImg,
  adminController.updateBlog
);
router.delete(
  "/admin/:id",
  auth,
  allowedTo("admin"),
  adminController.deleteBlog
);

// Status toggles
router.patch(
  "/admin/:id/featured",
  auth,
  allowedTo("admin"),
  adminController.toggleFeatured
);
router.patch(
  "/admin/:id/trending",
  auth,
  allowedTo("admin"),
  adminController.toggleTrending
);

router.patch("/admin/bulk", auth, allowedTo("admin"), adminController.bulkUpdate);

router.patch(
  "/admin/:id/comments/:commentId/approve",
  auth,
  allowedTo("admin"),
  adminController.approveComment
);
router.delete(
  "/admin/:id/comments/:commentId",
  auth,
  allowedTo("admin"),
  adminController.deleteComment
);

router.get("/admin/stats", auth, allowedTo("admin"), adminController.getBlogStats);
router.get("/admin/:id/analytics", auth, allowedTo("admin"), adminController.getBlogAnalytics);
router.get("/admin/related-topics", auth, allowedTo("admin"), adminController.getRelatedTopics);

router.patch(
  "/admin/:id/content-sections",
  auth,
  allowedTo("admin"),
  adminController.updateContentSections
);
router.patch(
  "/admin/:id/seo",
  auth,
  allowedTo("admin"),
  adminController.updateSEO
);

router.get("/", blogController.getAllBlogs);
router.get("/featured", blogController.getFeaturedBlogs);
router.get("/trending", blogController.getTrendingBlogs);
router.get("/categories", blogController.getCategories);
router.get("/related-topics", blogController.getRelatedTopics);
router.get("/popular", blogController.getPopularPosts);
router.get("/category/:category", blogController.getBlogsByCategory);

router.post("/:id/like", blogController.likeBlog);
router.post("/:id/dislike", blogController.disLikeBlog);
router.post("/:id/share", blogController.shareBlog);
router.post("/:id/comment", blogController.addComment);
router.post("/:id/newsletter-signup", blogController.trackNewsletterSignup);

router.get("/:slug", blogController.getBlogBySlug);

export default router;