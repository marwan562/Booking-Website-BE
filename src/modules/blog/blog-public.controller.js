import Blog from "../../models/blogModel.js";
import {
  transformBlog,
  buildLocalizedSearchQuery,
  buildCategorySearchQuery,
  isValidLocale,
} from "../../utilities/localizationUtils.js";

class BlogController {
  async getAllBlogs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const category = req.query.category;
      const search = req.query.search;
      const sort = req.query.sort || "-publishedAt";
      const locale = isValidLocale(req.query.locale) ? req.query.locale : "en";

      let query = { status: "published" };

      if (category && category !== "all") {
        query = { ...query, ...buildCategorySearchQuery(category, locale) };
      }

      if (search) {
        query.$or = buildLocalizedSearchQuery(search, locale, [
          "title",
          "excerpt",
          "tags",
          "relatedTopics",
        ]);
      }

      const blogs = await Blog.find(query)
        .populate("author", "name lastname avatar city role")
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content -comments -contentSections")
        .lean();

      const total = await Blog.countDocuments(query);

      const transformedBlogs = blogs.map((blog) => transformBlog(blog, locale));

      res.status(200).json({
        success: true,
        data: transformedBlogs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalBlogs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching public blogs:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching blogs",
        error: error.message,
      });
    }
  }

  async getFeaturedBlogs(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 3;
      const locale = isValidLocale(req.query.locale) ? req.query.locale : "en";

      const blogs = await Blog.getFeatured(locale)
        .populate("author", "name lastname avatar")
        .limit(limit)
        .select("-content -comments -contentSections")
        .lean();

      // Transform blogs for localization
      const transformedBlogs = blogs.map((blog) => transformBlog(blog, locale));

      res.status(200).json({
        success: true,
        data: transformedBlogs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching featured blogs",
        error: error.message,
      });
    }
  }

  async getTrendingBlogs(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const locale = req.query.locale || "en";

      const blogs = await Blog.find({
        status: "published",
        trending: true,
      })
        .populate("author", "name lastname avatar")
        .sort("-views")
        .limit(limit)
        .select("-content -comments -contentSections")
        .lean();

      console.log(`Found ${blogs.length} trending blogs`);

      const transformedBlogs = blogs.map((blog) => transformBlog(blog, locale));

      res.status(200).json({
        success: true,
        data: transformedBlogs,
      });
    } catch (error) {
      console.error("Error fetching trending blogs:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching trending blogs",
        error: error.message,
      });
    }
  }

  async getBlogBySlug(req, res) {
    try {
      const { slug } = req.params;
      const locale = req.query.locale || "en";

      console.log(`Looking for blog with slug: ${slug}, locale: ${locale}`);

      const blog = await Blog.findOneAndUpdate(
        {
          [`slug.${locale}`]: slug,
          status: "published",
        },
        { $inc: { views: 1 } },
        { new: true }
      )
        .populate({
          path: "author",
          select: "name lastname avatar city instagram role",
        })
        .populate({
          path: "comments.author",
          select: "name avatar",
          match: { approved: true },
        })
        .populate({
          path: "comments.replies.author",
          select: "name avatar",
        })
        .lean();

      if (!blog) {
        console.log(`Blog with slug '${slug}' not found`);
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      // Filter approved comments only
      if (blog.comments) {
        blog.comments = blog.comments.filter((comment) => comment.approved);
      }

      // Get related blogs using the enhanced method
      const categoryValue = blog.category?.[locale] || blog.category?.en;
      const relatedBlogs = await Blog.getRelatedPosts(
        blog._id,
        categoryValue,
        locale,
        4
      )
        .select("title slug excerpt image publishedAt readTime views author category")
        .populate("author", "name nationality avatar")
        .lean();

      const transformedBlog = transformBlog(blog, locale);
      const transformedRelatedBlogs = relatedBlogs
        .map((blog) => transformBlog(blog, locale))
        .filter(Boolean);

      res.status(200).json({
        success: true,
        data: {
          blog: transformedBlog,
          related: transformedRelatedBlogs,
        },
      });
    } catch (error) {
      console.error("Error fetching blog by slug:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching blog",
        error: error.message,
      });
    }
  }

  async getBlogsByCategory(req, res) {
    try {
      const { category } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const locale = isValidLocale(req.query.locale) ? req.query.locale : "en";

      const blogs = await Blog.getByCategory(category, locale)
        .populate("author", "name lastname avatar")
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content -comments -contentSections")
        .lean();

      const total = await Blog.countDocuments({
        ...buildCategorySearchQuery(category, locale),
        status: "published",
      });

      // Transform blogs for localization
      const transformedBlogs = blogs.map((blog) => transformBlog(blog, locale));

      res.status(200).json({
        success: true,
        data: transformedBlogs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching blogs by category",
        error: error.message,
      });
    }
  }

  async likeBlog(req, res) {
    try {
      const { id } = req.params;
      const locale = isValidLocale(req.query.locale) ? req.query.locale : "en";

      const blog = await Blog.findByIdAndUpdate(
        id,
        { $inc: { likes: 1 } },
        { new: true }
      )
        .populate("author", "name lastname avatar")
        .lean();

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      // Transform blog for localization
      const transformedBlog = transformBlog(blog, locale);

      res.status(200).json({
        success: true,
        data: { likes: transformedBlog.likes },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error liking blog",
        error: error.message,
      });
    }
  }

  async disLikeBlog(req, res) {
    try {
      const { id } = req.params;
      const locale = isValidLocale(req.query.locale) ? req.query.locale : "en";

      const blog = await Blog.findByIdAndUpdate(
        id,
        { $inc: { likes: -1 } },
        { new: true }
      )
        .populate("author", "name lastname avatar")
        .lean();

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      const transformedBlog = transformBlog(blog, locale);

      res.status(200).json({
        success: true,
        data: { likes: transformedBlog.likes },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error disliking blog",
        error: error.message,
      });
    }
  }

  async shareBlog(req, res) {
    try {
      const { id } = req.params;

      const blog = await Blog.findByIdAndUpdate(
        id,
        { $inc: { shares: 1 } },
        { new: true }
      )
        .select("shares")
        .lean();

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      res.status(200).json({
        success: true,
        data: { shares: blog.shares },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error sharing blog",
        error: error.message,
      });
    }
  }

  // New method for adding comments
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { content, author } = req.body;

      if (!content || !author?.name || !author?.email) {
        return res.status(400).json({
          success: false,
          message: "Content, author name, and email are required",
        });
      }

      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      const comment = {
        author: {
          name: author.name,
          email: author.email,
          avatar: author.avatar || null,
        },
        content,
        createdAt: new Date(),
        approved: false,
      };

      blog.comments.push(comment);
      await blog.save();

      res.status(201).json({
        success: true,
        message:
          "Comment added successfully. It will be visible after approval.",
        data: comment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error adding comment",
        error: error.message,
      });
    }
  }

  // New method for newsletter signup tracking
  async trackNewsletterSignup(req, res) {
    try {
      const { id } = req.params;

      const blog = await Blog.findByIdAndUpdate(
        id,
        { $inc: { newsletterSignups: 1 } },
        { new: true }
      )
        .select("newsletterSignups")
        .lean();

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      res.status(200).json({
        success: true,
        data: { newsletterSignups: blog.newsletterSignups },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error tracking newsletter signup",
        error: error.message,
      });
    }
  }

  async getCategories(req, res) {
    try {
      console.log("getCategories called");

      const locale = req.query.locale || "en";

      const categories = await Blog.distinct(`category.${locale}`, {
        status: "published",
      });

      console.log(`Found categories:`, categories);

      res.status(200).json({
        success: true,
        data: categories.filter(Boolean),
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching categories",
        error: error.message,
      });
    }
  }

  // New method for getting related topics
  async getRelatedTopics(req, res) {
    try {
      const locale = req.query.locale || "en";
      const limit = parseInt(req.query.limit) || 15;

      const relatedTopics = await Blog.aggregate([
        { $match: { status: "published" } },
        { $unwind: "$relatedTopics" },
        { $group: { _id: `$relatedTopics.${locale}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);

      res.status(200).json({
        success: true,
        data: relatedTopics.map((topic) => ({
          name: topic._id,
          count: topic.count,
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching related topics",
        error: error.message,
      });
    }
  }

  // New method for getting popular posts (for sidebar)
  async getPopularPosts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const locale = req.query.locale || "en";

      const posts = await Blog.getMostPopular(limit);
      const transformedPosts = posts.map((blog) => transformBlog(blog, locale));

      res.status(200).json({
        success: true,
        data: transformedPosts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching popular posts",
        error: error.message,
      });
    }
  }
}

export { BlogController };
