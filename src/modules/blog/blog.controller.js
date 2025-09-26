import { validationResult } from "express-validator";
import Blog from "../../models/blogModel.js";
import slugify from "slugify";
import cloudinary from "cloudinary"; // Assuming Cloudinary for image uploads

class AdminController {
  async getAllBlogs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status || "all"; // 'all', 'published', 'draft', 'archived'
      const category = req.query.category;
      const search = req.query.search;
      const locale = req.query.locale || "all"; // 'en', 'ar', 'es', 'fr', 'all'

      let query = {};

      // Filter by status
      if (status !== "all") {
        query.published = status === "published";
      }

      // Filter by category (match on specified locale or English by default)
      if (category && category !== "all") {
        if (locale === "all") {
          query["category.en"] = category;
        } else {
          query[`category.${locale}`] = category;
        }
      }

      // Search functionality (search in title and content for the specified locale)
      if (search) {
        if (locale === "all") {
          query.$or = [
            { "title.en": { $regex: search, $options: "i" } },
            { "content.en": { $regex: search, $options: "i" } },
          ];
        } else {
          query.$or = [
            { [`title.${locale}`]: { $regex: search, $options: "i" } },
            { [`content.${locale}`]: { $regex: search, $options: "i" } },
          ];
        }
      }

      const blogs = await Blog.find(query)
        .sort({ updatedAt: -1 })
        .limit(limit)
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

      const {
        title,
        content,
        category,
        tags,
        author,
        published,
        publishDate,
        imagesToKeep,
        imagesToDelete,
      } = req.body;

      // Parse JSON fields if they come as strings (from FormData)
      const parsedData = {
        title: typeof title === "string" ? JSON.parse(title) : title,
        content: typeof content === "string" ? JSON.parse(content) : content,
        category: typeof category === "string" ? JSON.parse(category) : category,
        tags: typeof tags === "string" ? JSON.parse(tags) : tags,
        imagesToKeep:
          typeof imagesToKeep === "string" ? JSON.parse(imagesToKeep) : imagesToKeep,
        imagesToDelete:
          typeof imagesToDelete === "string" ? JSON.parse(imagesToDelete) : imagesToDelete,
      };

      // Generate slug based on English title
      const slug = slugify(parsedData.title.en, { lower: true, strict: true });

      // Handle main image upload
      let mainImg = null;
      if (req.files && req.files.mainImg) {
        const result = await cloudinary.uploader.upload(req.files.mainImg.path);
        mainImg = {
          url: result.secure_url,
          public_id: result.public_id,
        };
      }

      // Handle additional images
      let images = parsedData.imagesToKeep ? [...parsedData.imagesToKeep] : [];
      if (req.files && req.files.images) {
        const newImages = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];
        for (const file of newImages) {
          const result = await cloudinary.uploader.upload(file.path);
          images.push({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }

      // Delete images if specified
      if (parsedData.imagesToDelete && parsedData.imagesToDelete.length > 0) {
        for (const public_id of parsedData.imagesToDelete) {
          await cloudinary.uploader.destroy(public_id);
        }
      }

      const blogData = {
        title: parsedData.title,
        slug,
        content: parsedData.content,
        category: parsedData.category,
        mainImg,
        images,
        tags: parsedData.tags || [],
        author: author || req.user.id, // Assuming req.user.id from auth middleware
        published: published === "true" || published === true,
        publishDate: publishDate || (published ? new Date() : null),
        featured: false,
        trending: false,
        views: 0,
        likes: 0,
        totalComments: 0,
        averageRating: 0,
      };

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

  async updateBlog(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        content,
        category,
        tags,
        author,
        published,
        publishDate,
        imagesToKeep,
        imagesToDelete,
      } = req.body;

      // Parse JSON fields if they come as strings (from FormData)
      const parsedData = {
        title: typeof title === "string" ? JSON.parse(title) : title,
        content: typeof content === "string" ? JSON.parse(content) : content,
        category: typeof category === "string" ? JSON.parse(category) : category,
        tags: typeof tags === "string" ? JSON.parse(tags) : tags,
        imagesToKeep:
          typeof imagesToKeep === "string" ? JSON.parse(imagesToKeep) : imagesToKeep,
        imagesToDelete:
          typeof imagesToDelete === "string" ? JSON.parse(imagesToDelete) : imagesToDelete,
      };

      // Generate new slug if title.en changes
      const existingBlog = await Blog.findById(id);
      if (!existingBlog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      const slug = parsedData.title.en
        ? slugify(parsedData.title.en, { lower: true, strict: true })
        : existingBlog.slug;

      // Handle main image update
      let mainImg = existingBlog.mainImg;
      if (req.files && req.files.mainImg) {
        if (mainImg && mainImg.public_id) {
          await cloudinary.uploader.destroy(mainImg.public_id);
        }
        const result = await cloudinary.uploader.upload(req.files.mainImg.path);
        mainImg = {
          url: result.secure_url,
          public_id: result.public_id,
        };
      }

      // Handle additional images
      let images = parsedData.imagesToKeep ? [...parsedData.imagesToKeep] : existingBlog.images;
      if (req.files && req.files.images) {
        const newImages = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];
        for (const file of newImages) {
          const result = await cloudinary.uploader.upload(file.path);
          images.push({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }

      // Delete images if specified
      if (parsedData.imagesToDelete && parsedData.imagesToDelete.length > 0) {
        for (const public_id of parsedData.imagesToDelete) {
          await cloudinary.uploader.destroy(public_id);
        }
        images = images.filter((img) => !parsedData.imagesToDelete.includes(img.public_id));
      }

      const updateData = {
        title: parsedData.title || existingBlog.title,
        slug,
        content: parsedData.content || existingBlog.content,
        category: parsedData.category || existingBlog.category,
        mainImg,
        images,
        tags: parsedData.tags || existingBlog.tags,
        author: author || existingBlog.author,
        published: published !== undefined ? published === "true" || published === true : existingBlog.published,
        publishDate: publishDate || existingBlog.publishDate,
      };

      const blog = await Blog.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

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

  async deleteBlog(req, res) {
    try {
      const { id } = req.params;

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      // Delete associated images from Cloudinary
      if (blog.mainImg && blog.mainImg.public_id) {
        await cloudinary.uploader.destroy(blog.mainImg.public_id);
      }
      if (blog.images && blog.images.length > 0) {
        for (const img of blog.images) {
          if (img.public_id) {
            await cloudinary.uploader.destroy(img.public_id);
          }
        }
      }

      await Blog.findByIdAndDelete(id);

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
        message: `Blog ${blog.featured ? "featured" : "unfeatured"} successfully`,
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
        message: `Blog ${blog.trending ? "marked as trending" : "removed from trending"} successfully`,
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
          updateQuery = { published: true, publishDate: new Date() };
          break;
        case "unpublish":
          updateQuery = { published: false };
          break;
        case "archive":
          updateQuery = { published: false }; // Assuming archived is unpublished
          break;
        case "feature":
          updateQuery = { featured: value };
          break;
        case "trending":
          updateQuery = { trending: value };
          break;
        case "category":
          updateQuery = {
            category: typeof value === "string" ? JSON.parse(value) : value,
          };
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

  async getBlogStats(req, res) {
    try {
      const stats = await Blog.aggregate([
        {
          $group: {
            _id: null,
            totalBlogs: { $sum: 1 },
            publishedBlogs: {
              $sum: { $cond: [{ $eq: ["$published", true] }, 1, 0] },
            },
            draftBlogs: {
              $sum: { $cond: [{ $eq: ["$published", false] }, 1, 0] },
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
        { $match: { published: true } },
        { $group: { _id: "$category.en", count: { $sum: 1 } } }, // Group by English category
        { $sort: { count: -1 } },
      ]);

      const monthlyStats = await Blog.aggregate([
        { $match: { published: true, publishDate: { $exists: true } } },
        {
          $group: {
            _id: {
              year: { $year: "$publishDate" },
              month: { $month: "$publishDate" },
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