import { validationResult } from "express-validator";
import Blog from "../../models/blogModel.js";
import slugify from "slugify";
import cloudinary from "cloudinary"; // Assuming Cloudinary for image uploads

class AdminController {
  async getAllBlogs(req, res) {
    try {
      console.log("getAllBlogsAdmin called with query:", req.query);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const category = req.query.category;
      const search = req.query.search || req.query.keyword;
      const sort = req.query.sort || "-createdAt";
      const status = req.query.status;
      const locale = req.query.locale || "en";

      let query = {};

      // Filter by status if specified
      if (status && status !== "all") {
        query.status = status;
      }

      // Filter by category - check if buildCategorySearchQuery function exists
      if (category && category !== "all") {
        // Simple category filter if buildCategorySearchQuery is not available
        query[`category.${locale}`] = new RegExp(category, "i");
      }

      // Search functionality - check if buildLocalizedSearchQuery function exists
      if (search) {
        // Simple search if buildLocalizedSearchQuery is not available
        query.$or = [
          { [`title.${locale}`]: { $regex: search, $options: "i" } },
          { [`title.en`]: { $regex: search, $options: "i" } },
          { [`excerpt.${locale}`]: { $regex: search, $options: "i" } },
          { [`excerpt.en`]: { $regex: search, $options: "i" } },
        ];
      }

      console.log("MongoDB query:", JSON.stringify(query, null, 2));

      const blogs = await Blog.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean(); // Don't exclude content for admin

      const total = await Blog.countDocuments(query);

      console.log(`Found ${blogs.length} blogs out of ${total} total`);

      // For admin: Return raw data without transformation
      const adminBlogs = blogs.map((blog) => ({
        ...blog,
        _id: blog._id.toString(),
      }));

      res.status(200).json({
        success: true,
        data: adminBlogs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalBlogs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Error in getAllBlogsAdmin:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching blogs for admin",
        error: error.message,
      });
    }
  }

  async createBlog(req, res) {
    try {
      // Validate request using express-validator
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        title,
        excerpt,
        content,
        category,
        status,
        featured,
        trending,
        tags,
        readTime,
        views,
        likes,
        seo,
        publishedAt,
        scheduledFor,
        image: imageData,
        imageMetadata, // New field for image metadata when file is uploaded
      } = req.body;

      // Parse JSON fields if they come as strings (from FormData)
      const parsedData = {
        title: typeof title === "string" ? JSON.parse(title) : title,
        excerpt: typeof excerpt === "string" ? JSON.parse(excerpt) : excerpt,
        content: typeof content === "string" ? JSON.parse(content) : content,
        category:
          typeof category === "string" ? JSON.parse(category) : category,
        tags: typeof tags === "string" ? JSON.parse(tags) : tags,
        seo: typeof seo === "string" ? JSON.parse(seo) : seo,
        status: status || "draft",
        featured:
          featured !== undefined
            ? featured === "true" || featured === true
            : false,
        trending:
          trending !== undefined
            ? trending === "true" || trending === true
            : false,
        readTime: readTime !== undefined ? Number(readTime) : 5,
        views: views !== undefined ? Number(views) : 0,
        likes: likes !== undefined ? Number(likes) : 0,
        publishedAt: publishedAt || null,
        scheduledFor: scheduledFor || null,
      };

      // Parse image metadata if provided
      const parsedImageMetadata = imageMetadata
        ? typeof imageMetadata === "string"
          ? JSON.parse(imageMetadata)
          : imageMetadata
        : null;

      // Handle image - it's already processed by saveImg middleware if file was uploaded
      let image = null;
      if (req.body.image) {
        // Image was uploaded and processed by saveImg middleware (Cloudinary result)
        image = {
          url: req.body.image.secure_url || req.body.image.url,
          public_id: req.body.image.public_id,
          alt: parsedImageMetadata?.alt || "",
          caption: parsedImageMetadata?.caption || { en: "", es: "", fr: "" },
        };
      } else if (imageData && typeof imageData === "string") {
        // Image data provided as JSON string (existing URL)
        const parsedImageData = JSON.parse(imageData);
        image = {
          url: parsedImageData.url,
          public_id: parsedImageData.public_id || "",
          alt: parsedImageData.alt || "",
          caption: parsedImageData.caption || { en: "", es: "", fr: "" },
        };
      }

      const blogData = {
        title: parsedData.title,
        excerpt: parsedData.excerpt,
        content: parsedData.content,
        category: parsedData.category,
        image,
        status: parsedData.status,
        featured: parsedData.featured,
        trending: parsedData.trending,
        tags: parsedData.tags || [],
        readTime: parsedData.readTime,
        views: parsedData.views,
        likes: parsedData.likes,
        seo: parsedData.seo || {
          metaTitle: { en: "", es: "", fr: "" },
          metaDescription: { en: "", es: "", fr: "" },
          keywords: [],
        },
        publishedAt: parsedData.publishedAt
          ? new Date(parsedData.publishedAt)
          : null,
        scheduledFor: parsedData.scheduledFor
          ? new Date(parsedData.scheduledFor)
          : null,
      };

      const blog = new Blog(blogData);
      await blog.save();

      res.status(201).json({
        success: true,
        message: "Blog created successfully",
        data: blog,
      });
    } catch (error) {
      console.error("Error creating blog:", error);
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
        excerpt,
        content,
        category,
        status,
        featured,
        trending,
        tags,
        readTime,
        views,
        likes,
        seo,
        publishedAt,
        scheduledFor,
        image: imageData,
        imageMetadata, // For file uploads with metadata
      } = req.body;

      console.log("Update blog request for ID:", id);
      console.log("Request body keys:", Object.keys(req.body));

      // Parse JSON fields if they come as strings (from FormData)
      const parsedData = {
        title: typeof title === "string" ? JSON.parse(title) : title,
        excerpt: typeof excerpt === "string" ? JSON.parse(excerpt) : excerpt,
        content: typeof content === "string" ? JSON.parse(content) : content,
        category:
          typeof category === "string" ? JSON.parse(category) : category,
        tags: typeof tags === "string" ? JSON.parse(tags) : tags,
        seo: typeof seo === "string" ? JSON.parse(seo) : seo,
        status: status || "draft",
        featured:
          featured !== undefined
            ? featured === "true" || featured === true
            : false,
        trending:
          trending !== undefined
            ? trending === "true" || trending === true
            : false,
        readTime: readTime !== undefined ? Number(readTime) : undefined,
        views: views !== undefined ? Number(views) : undefined,
        likes: likes !== undefined ? Number(likes) : undefined,
        publishedAt: publishedAt || null,
        scheduledFor: scheduledFor || null,
      };

      // Parse image metadata if provided
      const parsedImageMetadata = imageMetadata
        ? typeof imageMetadata === "string"
          ? JSON.parse(imageMetadata)
          : imageMetadata
        : null;

      // Get existing blog
      const existingBlog = await Blog.findById(id);
      if (!existingBlog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      // Generate slug from English title if title is provided
      let slug = existingBlog.slug;
      if (
        parsedData.title?.en &&
        parsedData.title.en !== existingBlog.title?.en
      ) {
        const baseSlug = slugify(parsedData.title.en, {
          lower: true,
          strict: true,
        });
        // Check if slug exists for other blogs
        const slugExists = await Blog.findOne({
          _id: { $ne: id },
          "slug.en": baseSlug,
        });
        slug = {
          ...existingBlog.slug,
          en: slugExists ? `${baseSlug}-${Date.now()}` : baseSlug,
        };
      }

      // Handle image update
      let image = existingBlog.image;
      if (
        req.body.image &&
        typeof req.body.image === "object" &&
        req.body.image.secure_url
      ) {
        // New image was uploaded via middleware
        if (existingBlog.image?.public_id) {
          try {
            await cloudinary.uploader.destroy(existingBlog.image.public_id);
          } catch (error) {
            console.warn("Failed to delete old image:", error.message);
          }
        }

        image = {
          url: req.body.image.secure_url,
          public_id: req.body.image.public_id,
          alt: parsedImageMetadata?.alt || existingBlog.image?.alt || "",
          caption: parsedImageMetadata?.caption ||
            existingBlog.image?.caption || { en: "", es: "", fr: "" },
        };
      } else if (imageData && typeof imageData === "string") {
        // Image data provided as JSON string (existing URL or new URL)
        const parsedImageData = JSON.parse(imageData);
        image = {
          url: parsedImageData.url || existingBlog.image?.url,
          public_id:
            parsedImageData.public_id || existingBlog.image?.public_id || "",
          alt: parsedImageData.alt || existingBlog.image?.alt || "",
          caption: parsedImageData.caption ||
            existingBlog.image?.caption || { en: "", es: "", fr: "" },
        };
      }

      // Prepare update data
      const updateData = {
        title: parsedData.title || existingBlog.title,
        slug: slug,
        excerpt: parsedData.excerpt || existingBlog.excerpt,
        content: parsedData.content || existingBlog.content,
        category: parsedData.category || existingBlog.category,
        image: image,
        status: parsedData.status,
        featured: parsedData.featured,
        trending: parsedData.trending,
        tags: parsedData.tags || existingBlog.tags || [],
        readTime:
          parsedData.readTime !== undefined
            ? parsedData.readTime
            : existingBlog.readTime,
        views:
          parsedData.views !== undefined
            ? parsedData.views
            : existingBlog.views,
        likes:
          parsedData.likes !== undefined
            ? parsedData.likes
            : existingBlog.likes,
        seo: parsedData.seo ||
          existingBlog.seo || {
            metaTitle: { en: "", es: "", fr: "" },
            metaDescription: { en: "", es: "", fr: "" },
            keywords: [],
          },
        publishedAt: parsedData.publishedAt
          ? new Date(parsedData.publishedAt)
          : existingBlog.publishedAt,
        scheduledFor: parsedData.scheduledFor
          ? new Date(parsedData.scheduledFor)
          : existingBlog.scheduledFor,
      };

      console.log("Update data:", JSON.stringify(updateData, null, 2));

      const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        success: true,
        message: "Blog updated successfully",
        data: updatedBlog,
      });
    } catch (error) {
      console.error("Error updating blog:", error);
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
