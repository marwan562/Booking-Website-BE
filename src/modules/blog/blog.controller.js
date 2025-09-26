import { validationResult } from "express-validator";
import Blog from "../../models/blogModel.js";
import slugify from "slugify";

class AdminController {
  async getAllBlogs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status || "all";
      const category = req.query.category;
      const search = req.query.search;

      let query = {};

      // Filter by status
      if (status !== "all") {
        query.status = status;
      }

      // Filter by category
      if (category && category !== "all") {
        query.category = category;
      }

      // Search functionality
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } },
          { "author.name": { $regex: search, $options: "i" } },
        ];
      }

      const blogs = await Blog.find(query)
        .sort({ updatedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Blog.countDocuments(query);

      res.status(200).json({
        success: true,
        data: blogs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: blogs.length,
          totalBlogs: total,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching blogs",
        error: error.message,
      });
    }
  }

  // Create new blog post
  async createBlog(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const blogData = req.body;

      // Generate slug if not provided
      if (!blogData.slug) {
        blogData.slug = slugify(blogData.title, { lower: true, strict: true });
      }

      const blog = new Blog(blogData);
      await blog.save();

      res.status(201).json({
        success: true,
        message: "Blog created successfully",
        data: blog,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Blog with this slug already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating blog",
        error: error.message,
      });
    }
  }

  // Update blog post
  async updateBlog(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const blog = await Blog.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Blog updated successfully",
        data: blog,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating blog",
        error: error.message,
      });
    }
  }

  // Delete blog post
  async deleteBlog(req, res) {
    try {
      const { id } = req.params;

      const blog = await Blog.findByIdAndDelete(id);

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Blog deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error deleting blog",
        error: error.message,
      });
    }
  }

  // Toggle featured status
  async toggleFeatured(req, res) {
    try {
      const { id } = req.params;

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      blog.featured = !blog.featured;
      await blog.save();

      res.status(200).json({
        success: true,
        message: `Blog ${
          blog.featured ? "featured" : "unfeatured"
        } successfully`,
        data: blog,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating featured status",
        error: error.message,
      });
    }
  }

  // Toggle trending status
  async toggleTrending(req, res) {
    try {
      const { id } = req.params;

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      blog.trending = !blog.trending;
      await blog.save();

      res.status(200).json({
        success: true,
        message: `Blog ${
          blog.trending ? "marked as trending" : "removed from trending"
        } successfully`,
        data: blog,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating trending status",
        error: error.message,
      });
    }
  }

  // Bulk operations
  async bulkUpdate(req, res) {
    try {
      const { ids, action, value } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid blog IDs provided",
        });
      }

      let updateQuery = {};

      switch (action) {
        case "publish":
          updateQuery = { status: "published", publishedAt: new Date() };
          break;
        case "unpublish":
          updateQuery = { status: "draft" };
          break;
        case "archive":
          updateQuery = { status: "archived" };
          break;
        case "feature":
          updateQuery = { featured: value };
          break;
        case "trending":
          updateQuery = { trending: value };
          break;
        case "category":
          updateQuery = { category: value };
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid bulk action",
          });
      }

      const result = await Blog.updateMany({ _id: { $in: ids } }, updateQuery);

      res.status(200).json({
        success: true,
        message: `Successfully updated ${result.modifiedCount} blogs`,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error performing bulk update",
        error: error.message,
      });
    }
  }

  // Get blog analytics/stats
  async getBlogStats(req, res) {
    try {
      const stats = await Blog.aggregate([
        {
          $group: {
            _id: null,
            totalBlogs: { $sum: 1 },
            publishedBlogs: {
              $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
            },
            draftBlogs: {
              $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
            },
            featuredBlogs: {
              $sum: { $cond: ["$featured", 1, 0] },
            },
            trendingBlogs: {
              $sum: { $cond: ["$trending", 1, 0] },
            },
            totalViews: { $sum: "$views" },
            totalLikes: { $sum: "$likes" },
          },
        },
      ]);

      const categoryStats = await Blog.aggregate([
        { $match: { status: "published" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const monthlyStats = await Blog.aggregate([
        { $match: { status: "published", publishedAt: { $exists: true } } },
        {
          $group: {
            _id: {
              year: { $year: "$publishedAt" },
              month: { $month: "$publishedAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]);

      res.status(200).json({
        success: true,
        data: {
          overview: stats[0] || {},
          categoryBreakdown: categoryStats,
          monthlyPublications: monthlyStats,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching blog statistics",
        error: error.message,
      });
    }
  }
}

export { AdminController };
