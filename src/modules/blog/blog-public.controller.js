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
      const search = req.query.search; // Changed from keyword to search for consistency
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
        ]);
      }

      const blogs = await Blog.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content")
        .lean();

      const total = await Blog.countDocuments(query);

      // Transform blogs for public consumption (localized)
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
        .limit(limit)
        .select("-content")
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
      const locale = isValidLocale(req.query.locale) ? req.query.locale : "en";

      const blogs = await Blog.getTrending(locale)
        .limit(limit)
        .select("-content")
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
        message: "Error fetching trending blogs",
        error: error.message,
      });
    }
  }

  async getBlogBySlug(req, res) {
    try {
      const { slug } = req.params;
      const locale = isValidLocale(req.query.locale) ? req.query.locale : "en";

      const blog = await Blog.findOneAndUpdate(
        { [`slug.${locale}`]: slug, status: "published" },
        { $inc: { views: 1 } },
        { new: true }
      ).lean();

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      // Get related blogs (same category, excluding current blog)
      const relatedBlogs = await Blog.find({
        [`category.${locale}`]: blog.category[locale],
        _id: { $ne: blog._id },
        status: "published",
      })
        .limit(4)
        .select("-content")
        .lean();

      // Transform blog and related blogs for localization
      const transformedBlog = transformBlog(blog, locale);
      const transformedRelatedBlogs = relatedBlogs.map((blog) =>
        transformBlog(blog, locale)
      );

      res.status(200).json({
        success: true,
        data: {
          blog: transformedBlog,
          related: transformedRelatedBlogs,
        },
      });
    } catch (error) {
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
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content")
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
      ).lean();

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

  async getCategories(req, res) {
    try {
      const locale = isValidLocale(req.query.locale) ? req.query.locale : "en";

      const categories = await Blog.distinct(`category.${locale}`, {
        status: "published",
      });

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching categories",
        error: error.message,
      });
    }
  }
}

export { BlogController };
