import { BlogController } from "./blog-public.controller.js";
import { AdminController } from "./blog.controller.js";
import { auth, allowedTo } from "../../middlewares/auth.js";
import { blogValidation } from "./blog.validation.js";
import { uploadMixfile } from "../../middlewares/fileUpload.js";

const router = express.Router();
const blogController = new BlogController();
const adminController = new AdminController();

router.get("/", blogController.getAllBlogs);
router.get("/featured", blogController.getFeaturedBlogs);
router.get("/trending", blogController.getTrendingBlogs);
router.get("/categories", blogController.getCategories);
router.get("/category/:category", blogController.getBlogsByCategory);
router.get("/:slug", blogController.getBlogBySlug);
router.post("/:id/like", blogController.likeBlog);

router.use("/admin", auth, allowedTo("admin"));

router.get("/admin", adminController.getAllBlogs);
router.post(
  "/admin",
  blogValidation,
  uploadMixfile([{ name: "image", maxCount: 1 }]),
  saveImg,
  adminController.createBlog
);
router.put("/admin/:id", blogValidation, adminController.updateBlog);
router.delete("/admin/:id", adminController.deleteBlog);
router.patch("/admin/:id/featured", adminController.toggleFeatured);
router.patch("/admin/:id/trending", adminController.toggleTrending);
router.post("/admin/bulk", adminController.bulkUpdate);
router.get("/admin/stats", adminController.getBlogStats);

export default router;
