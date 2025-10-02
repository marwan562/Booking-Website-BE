import { validationResult } from "express-validator";
import Blog from "../../models/blogModel.js";
import slugify from "slugify";
import cloudinary from "cloudinary";

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

      if (status && status !== "all") {
        query.status = status;
      }

      if (category && category !== "all") {
        query[`category.${locale}`] = new RegExp(category, "i");
      }

      if (search) {
        query.$or = [
          { [`title.${locale}`]: { $regex: search, $options: "i" } },
          { [`title.en`]: { $regex: search, $options: "i" } },
          { [`excerpt.${locale}`]: { $regex: search, $options: "i" } },
          { [`excerpt.en`]: { $regex: search, $options: "i" } },
          { [`relatedTopics.${locale}`]: { $regex: search, $options: "i" } },
        ];
      }

      console.log("MongoDB query:", JSON.stringify(query, null, 2));

      const blogs = await Blog.find(query)
        .populate("author", "name lastname email avatar role")
        .populate("comments.author", "name avatar")
        .populate("comments.replies.author", "name avatar")
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Blog.countDocuments(query);

      console.log(`Found ${blogs.length} blogs out of ${total} total`);

      const adminBlogs = blogs.map((blog) => ({
        ...blog,
        _id: blog._id.toString(),
        commentCount: blog.comments
          ? blog.comments.filter((c) => c.approved).length
          : 0,
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

  async getBlogById(req, res) {
    try {
      const { id } = req.params;
      const locale = req.query.locale || "en";

      const blog = await Blog.findById(id)
        .populate("author", "name lastname email avatar role city instagram")
        .populate("comments.author", "name avatar")
        .populate("comments.replies.author", "name avatar");

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      if (blog.status === "published") {
        await Blog.findByIdAndUpdate(id, { $inc: { views: 1 } });
        blog.views += 1;
      }

      const relatedBlogs = await Blog.getRelatedPosts(
        id,
        blog.category[locale] || blog.category.en,
        locale,
        5
      );

      res.status(200).json({
        success: true,
        data: {
          blog,
          relatedBlogs,
        },
      });
    } catch (error) {
      console.error("Error fetching blog details:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching blog details",
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
        relatedTopics,
        readTime,
        views,
        likes,
        shares,
        seo,
        publishedAt,
        scheduledFor,
        image: imageData,
        additionalImages,
        imageMetadata,
        additionalImageData,
        author,
        contentSections,
        structuredData,
      } = req.body;

      const parsedData = {
        title: typeof title === "string" ? JSON.parse(title) : title,
        excerpt: typeof excerpt === "string" ? JSON.parse(excerpt) : excerpt,
        content: typeof content === "string" ? JSON.parse(content) : content,
        category:
          typeof category === "string" ? JSON.parse(category) : category,
        tags: typeof tags === "string" ? JSON.parse(tags) : tags,
        relatedTopics:
          typeof relatedTopics === "string"
            ? JSON.parse(relatedTopics)
            : relatedTopics,
        seo: typeof seo === "string" ? JSON.parse(seo) : seo,
        author: typeof author === "string" ? JSON.parse(author) : author,
        additionalImages:
          typeof additionalImages === "string"
            ? JSON.parse(additionalImages)
            : additionalImages,
        contentSections:
          typeof contentSections === "string"
            ? JSON.parse(contentSections)
            : contentSections,
        structuredData:
          typeof structuredData === "string"
            ? JSON.parse(structuredData)
            : structuredData,
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
        shares: shares !== undefined ? Number(shares) : 0,
        publishedAt: publishedAt || null,
        scheduledFor: scheduledFor || null,
      };

      const parsedImageMetadata = imageMetadata
        ? typeof imageMetadata === "string"
          ? JSON.parse(imageMetadata)
          : imageMetadata
        : null;

      let image = null;
      if (req.body.image) {
        image = {
          url: req.body.image.secure_url || req.body.image.url,
          public_id: req.body.image.public_id,
          alt: parsedImageMetadata?.alt || "",
          caption: parsedImageMetadata?.caption || { en: "", es: "", fr: "" },
        };
      } else if (imageData && typeof imageData === "string") {
        const parsedImageData = JSON.parse(imageData);
        image = {
          url: parsedImageData.url,
          public_id: parsedImageData.public_id || "",
          alt: parsedImageData.alt || "",
          caption: parsedImageData.caption || { en: "", es: "", fr: "" },
        };
      }

      const parsedAdditionalImageMetadata = additionalImageData
        ? typeof additionalImageData === "string"
          ? JSON.parse(additionalImageData)
          : additionalImageData
        : null;

        if (req.body.additionalImages) {
          req.body.additionalImages.forEach((image, index) => {
            req.body.additionalImages[index] = {
              url: image.secure_url || image.url,
              public_id: image.public_id,
              alt: parsedAdditionalImageMetadata[index]?.alt || "",
              caption: parsedAdditionalImageMetadata[index]?.caption || { en: "", es: "", fr: "" },
            };
          });
        }

      const blogData = {
        title: parsedData.title,
        excerpt: parsedData.excerpt,
        content: parsedData.content,
        category: parsedData.category,
        image,
        author: parsedData.author || req.user?.id,
        additionalImages: parsedData.additionalImages || [],
        status: parsedData.status,
        featured: parsedData.featured,
        trending: parsedData.trending,
        tags: parsedData.tags || [],
        relatedTopics: parsedData.relatedTopics || [],
        readTime: parsedData.readTime,
        views: parsedData.views,
        likes: parsedData.likes,
        shares: parsedData.shares,
        comments: [],
        newsletterSignups: 0,
        contentSections: parsedData.contentSections || [],
        seo: parsedData.seo || {
          metaTitle: { en: "", es: "", fr: "" },
          metaDescription: { en: "", es: "", fr: "" },
          keywords: [],
          ogImage: "",
          ogDescription: { en: "", es: "", fr: "" },
        },
        structuredData: parsedData.structuredData || {
          breadcrumbs: [],
          faq: [],
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
        relatedTopics,
        readTime,
        views,
        likes,
        shares,
        seo,
        publishedAt,
        scheduledFor,
        image: imageData,
        additionalImages,
        imageMetadata,
        author,
        contentSections,
        structuredData,
      } = req.body;

      console.log("Update blog request for ID:", id);
      console.log("Request body keys:", Object.keys(req.body));

      const parsedData = {
        title: typeof title === "string" ? JSON.parse(title) : title,
        excerpt: typeof excerpt === "string" ? JSON.parse(excerpt) : excerpt,
        content: typeof content === "string" ? JSON.parse(content) : content,
        category:
          typeof category === "string" ? JSON.parse(category) : category,
        tags: typeof tags === "string" ? JSON.parse(tags) : tags,
        relatedTopics:
          typeof relatedTopics === "string"
            ? JSON.parse(relatedTopics)
            : relatedTopics,
        seo: typeof seo === "string" ? JSON.parse(seo) : seo,
        author: typeof author === "string" ? JSON.parse(author) : author,
        image:
          typeof imageData === "string" ? JSON.parse(imageData) : imageData,
        // FIX: Properly parse additionalImages
        additionalImages:
          typeof additionalImages === "string"
            ? JSON.parse(additionalImages)
            : additionalImages || [],
        contentSections:
          typeof contentSections === "string"
            ? JSON.parse(contentSections)
            : contentSections,
        structuredData:
          typeof structuredData === "string"
            ? JSON.parse(structuredData)
            : structuredData,
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
        shares: shares !== undefined ? Number(shares) : undefined,
        publishedAt: publishedAt || null,
        scheduledFor: scheduledFor || null,
      };

      // Debug: Log the parsed image data
      console.log("Parsed image data:", parsedData.image);
      console.log("req.body.image:", req.body.image);

      const parsedImageMetadata = imageMetadata
        ? typeof imageMetadata === "string"
          ? JSON.parse(imageMetadata)
          : imageMetadata
        : null;

      console.log("request data", parsedData);

      const existingBlog = await Blog.findById(id);
      if (!existingBlog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      let slug = existingBlog.slug;
      if (
        parsedData.title?.en &&
        parsedData.title.en !== existingBlog.title?.en
      ) {
        const baseSlug = slugify(parsedData.title.en, {
          lower: true,
          strict: true,
        });
        const slugExists = await Blog.findOne({
          _id: { $ne: id },
          "slug.en": baseSlug,
        });
        slug = {
          ...existingBlog.slug,
          en: slugExists ? `${baseSlug}-${Date.now()}` : baseSlug,
        };
      }

      try {
        if (req.body.image && existingBlog.image?.public_id) {
          await cloudinary.uploader.destroy(existingBlog.image.public_id);
        }
        if (
          req.body.additionalImages &&
          existingBlog.additionalImages?.length
        ) {
          existingBlog.additionalImages.forEach(async (img) => {
            if (img?.public_id)
              await cloudinary.uploader.destroy(img.public_id);
          });
        }
      } catch (error) {
        console.error("Error cleaning up old images:", error);
      }

      let updatedImage = existingBlog.image;

      // Handle image update logic
      if (req.body.image && req.body.image.secure_url) {
        // New file upload from multer
        updatedImage = {
          url: req.body.image.secure_url,
          public_id: req.body.image.public_id,
          alt: parsedImageMetadata?.alt || existingBlog.image?.alt || "",
          caption: parsedImageMetadata?.caption ||
            existingBlog.image?.caption || { en: "", es: "", fr: "" },
        };
      } else if (parsedData.image?.url) {
        // Existing image data from JSON
        updatedImage = {
          url: parsedData.image.url,
          public_id:
            parsedData.image.public_id || existingBlog.image?.public_id || "",
          alt: parsedData.image.alt || existingBlog.image?.alt || "",
          caption: parsedData.image.caption ||
            existingBlog.image?.caption || { en: "", es: "", fr: "" },
        };
      } else if (existingBlog.image?.url) {
        // Keep existing image if no new image provided
        updatedImage = existingBlog.image;
      } else {
        // This should not happen, but provide a fallback
        console.error("No image data found, this might cause validation error");
      }

      // FIX: Handle additionalImages with simplified approach
      let updatedAdditionalImages = [];

      // Debug logs
      console.log(
        "req.body.additionalImages type:",
        typeof req.body.additionalImages
      );
      console.log("req.body.additionalImages:", req.body.additionalImages);
      console.log(
        "req.body.existingAdditionalImages:",
        req.body.existingAdditionalImages
      );

      // First, add existing images (if any)
      if (req.body.existingAdditionalImages) {
        try {
          const existingImages =
            typeof req.body.existingAdditionalImages === "string"
              ? JSON.parse(req.body.existingAdditionalImages)
              : req.body.existingAdditionalImages;

          if (Array.isArray(existingImages)) {
            updatedAdditionalImages.push(
              ...existingImages.map((img) => ({
                url: img.url,
                public_id: img.public_id || "",
                alt: img.alt || "",
                caption: {
                  en: img.caption?.en || "Image caption",
                  es: img.caption?.es || "Descripción de imagen",
                  fr: img.caption?.fr || "",
                },
                position: img.position || "",
              }))
            );
          }
        } catch (error) {
          console.error("Error parsing existing additional images:", error);
        }
      }

      // Then, add newly uploaded images (processed by saveImg middleware)
      if (
        req.body.additionalImages &&
        Array.isArray(req.body.additionalImages)
      ) {
        const uploadedImages = req.body.additionalImages.map(
          (uploadedFile) => ({
            url: uploadedFile.secure_url || uploadedFile.url,
            public_id: uploadedFile.public_id,
            alt: parsedImageMetadata?.alt || "",
            caption: {
              en: parsedImageMetadata?.caption?.en || "Image caption",
              es: parsedImageMetadata?.caption?.es || "Descripción de imagen",
              fr: parsedImageMetadata?.caption?.fr || "",
            },
            position: "",
          })
        );

        updatedAdditionalImages.push(...uploadedImages);
      }
      // Fallback: handle string data (legacy support)
      else if (typeof req.body.additionalImages === "string") {
        try {
          const parsedImages = JSON.parse(req.body.additionalImages);
          if (Array.isArray(parsedImages)) {
            updatedAdditionalImages = parsedImages
              .filter((img) => img.url && img.url.trim() !== "")
              .map((img) => ({
                url: img.url,
                public_id: img.public_id || "",
                alt: img.alt || "",
                caption: {
                  en: img.caption?.en || "Image caption",
                  es: img.caption?.es || "Descripción de imagen",
                  fr: img.caption?.fr || "",
                },
                position: img.position || "",
              }));
          }
        } catch (error) {
          console.error("Error parsing additionalImages string:", error);
          updatedAdditionalImages = existingBlog.additionalImages || [];
        }
      }
      // If no additional images data at all, keep existing
      else if (
        !req.body.additionalImages &&
        !req.body.existingAdditionalImages
      ) {
        updatedAdditionalImages = existingBlog.additionalImages || [];
      }

      console.log("Final updatedAdditionalImages:", updatedAdditionalImages);

      const updateData = {
        title: parsedData.title || existingBlog.title,
        slug: slug,
        excerpt: parsedData.excerpt || existingBlog.excerpt,
        content: parsedData.content || existingBlog.content,
        category: parsedData.category || existingBlog.category,
        image: updatedImage,
        additionalImages: updatedAdditionalImages,
        author: parsedData.author || existingBlog.author,
        status: parsedData.status,
        featured: parsedData.featured,
        trending: parsedData.trending,
        tags: parsedData.tags || existingBlog.tags || [],
        relatedTopics:
          parsedData.relatedTopics || existingBlog.relatedTopics || [],
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
        shares:
          parsedData.shares !== undefined
            ? parsedData.shares
            : existingBlog.shares,
        contentSections:
          parsedData.contentSections || existingBlog.contentSections || [],
        seo: parsedData.seo ||
          existingBlog.seo || {
            metaTitle: { en: "", es: "", fr: "" },
            metaDescription: { en: "", es: "", fr: "" },
            keywords: [],
            ogImage: "",
            ogDescription: { en: "", es: "", fr: "" },
          },
        structuredData: parsedData.structuredData ||
          existingBlog.structuredData || {
            breadcrumbs: [],
            faq: [],
          },
        publishedAt: parsedData.publishedAt
          ? new Date(parsedData.publishedAt)
          : existingBlog.publishedAt,
        scheduledFor: parsedData.scheduledFor
          ? new Date(parsedData.scheduledFor)
          : existingBlog.scheduledFor,
        lastUpdated: new Date(),
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

      if (blog.image && blog.image.public_id) {
        await cloudinary.uploader.destroy(blog.image.public_id);
      }

      if (blog.additionalImages && blog.additionalImages.length > 0) {
        for (const img of blog.additionalImages) {
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

  async approveComment(req, res) {
    try {
      const { id, commentId } = req.params;

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      const comment = blog.comments.id(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }

      comment.approved = true;
      await blog.save();

      res.status(200).json({
        success: true,
        message: "Comment approved successfully",
        data: comment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error approving comment",
        error: error.message,
      });
    }
  }

  async deleteComment(req, res) {
    try {
      const { id, commentId } = req.params;

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      blog.comments.id(commentId).remove();
      await blog.save();

      res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error deleting comment",
        error: error.message,
      });
    }
  }

  async getBlogAnalytics(req, res) {
    try {
      const { id } = req.params;

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      const analytics = {
        views: blog.views,
        likes: blog.likes,
        shares: blog.shares,
        commentCount: blog.comments
          ? blog.comments.filter((c) => c.approved).length
          : 0,
        newsletterSignups: blog.newsletterSignups,
        readTime: blog.readTime,
        engagementRate:
          blog.views > 0
            ? (
                ((blog.likes + blog.shares + blog.comments.length) /
                  blog.views) *
                100
              ).toFixed(2)
            : 0,
        publishedAt: blog.publishedAt,
        lastUpdated: blog.lastUpdated,
      };

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching blog analytics",
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
              $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
            },
            draftBlogs: {
              $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
            },
            archivedBlogs: {
              $sum: { $cond: [{ $eq: ["$status", "archived"] }, 1, 0] },
            },
            featuredBlogs: {
              $sum: { $cond: ["$featured", 1, 0] },
            },
            trendingBlogs: {
              $sum: { $cond: ["$trending", 1, 0] },
            },
            totalViews: { $sum: "$views" },
            totalLikes: { $sum: "$likes" },
            totalShares: { $sum: "$shares" },
            totalComments: { $sum: { $size: "$comments" } },
            approvedComments: {
              $sum: {
                $size: {
                  $filter: {
                    input: "$comments",
                    cond: { $eq: ["$$this.approved", true] },
                  },
                },
              },
            },
          },
        },
      ]);

      const categoryStats = await Blog.aggregate([
        { $match: { status: "published" } },
        { $group: { _id: "$category.en", count: { $sum: 1 } } },
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
            totalViews: { $sum: "$views" },
            totalLikes: { $sum: "$likes" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]);

      const topPerformingBlogs = await Blog.aggregate([
        { $match: { status: "published" } },
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $multiply: ["$views", 1] },
                { $multiply: ["$likes", 5] },
                { $multiply: ["$shares", 10] },
                { $multiply: [{ $size: "$comments" }, 15] },
              ],
            },
          },
        },
        { $sort: { engagementScore: -1 } },
        { $limit: 10 },
        {
          $project: {
            title: "$title.en",
            views: 1,
            likes: 1,
            shares: 1,
            commentCount: { $size: "$comments" },
            engagementScore: 1,
            publishedAt: 1,
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          overview: stats[0] || {},
          categoryBreakdown: categoryStats,
          monthlyPublications: monthlyStats,
          topPerformingBlogs: topPerformingBlogs,
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

  async getRelatedTopics(req, res) {
    try {
      const relatedTopics = await Blog.aggregate([
        { $match: { status: "published" } },
        { $unwind: "$relatedTopics" },
        { $group: { _id: "$relatedTopics.en", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]);

      res.status(200).json({
        success: true,
        data: relatedTopics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching related topics",
        error: error.message,
      });
    }
  }

  async updateContentSections(req, res) {
    try {
      const { id } = req.params;
      const { contentSections } = req.body;

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      blog.contentSections = contentSections;
      blog.lastUpdated = new Date();
      await blog.save();

      res.status(200).json({
        success: true,
        message: "Content sections updated successfully",
        data: blog,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating content sections",
        error: error.message,
      });
    }
  }

  async updateSEO(req, res) {
    try {
      const { id } = req.params;
      const { seo, structuredData } = req.body;

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      if (seo) blog.seo = { ...blog.seo, ...seo };
      if (structuredData)
        blog.structuredData = { ...blog.structuredData, ...structuredData };
      blog.lastUpdated = new Date();

      await blog.save();

      res.status(200).json({
        success: true,
        message: "SEO data updated successfully",
        data: { seo: blog.seo, structuredData: blog.structuredData },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating SEO data",
        error: error.message,
      });
    }
  }
}

export { AdminController };
