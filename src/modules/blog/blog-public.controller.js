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
        ]);
      }

      const blogs = await Blog.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content")
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
      console.log("getTrendingBlogs called with query:", req.query);

      const limit = parseInt(req.query.limit) || 6;
      const locale = req.query.locale || "en";

      const blogs = await Blog.find({
        status: "published",
        trending: true,
      })
        .sort("-views")
        .limit(limit)
        .select("-content")
        .lean();

      console.log(`Found ${blogs.length} trending blogs`);

      const transformedBlogs = blogs
        .map((blog) => this.transformBlogSimple(blog, locale))
        .filter(Boolean);

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
      ).lean();

      if (!blog) {
        console.log(`Blog with slug '${slug}' not found`);
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }

      // Get related blogs
      const categoryValue = blog.category?.[locale] || blog.category?.en;
      const relatedBlogs = await Blog.find({
        [`category.${locale}`]: categoryValue,
        _id: { $ne: blog._id },
        status: "published",
      })
        .limit(4)
        .select("-content")
        .lean();

      const transformedBlog = this.transformBlogSimple(blog, locale);
      const transformedRelatedBlogs = relatedBlogs
        .map((blog) => this.transformBlogSimple(blog, locale))
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

  transformBlogSimple(blog, locale = "en") {
    if (!blog) return null;

    try {
      return {
        _id: blog._id.toString(),
        title: blog.title?.[locale] || blog.title?.en || "No title",
        excerpt: blog.excerpt?.[locale] || blog.excerpt?.en || "No excerpt",
        content: blog.content?.[locale] || blog.content?.en || "No content",
        slug: blog.slug?.[locale] || blog.slug?.en || "no-slug",
        category: blog.category?.[locale] || blog.category?.en || "General",
        image: blog.image
          ? {
              url: blog.image.url || "",
              public_id: blog.image.public_id || "",
              alt: blog.image.alt || "",
              caption:
                blog.image.caption?.[locale] || blog.image.caption?.en || "",
            }
          : { url: "", public_id: "", alt: "", caption: "" },
        status: blog.status,
        featured: blog.featured || false,
        trending: blog.trending || false,
        tags:
          blog.tags
            ?.map((tag) =>
              typeof tag === "string" ? tag : tag[locale] || tag.en || ""
            )
            .filter(Boolean) || [],
        readTime: blog.readTime || 5,
        views: blog.views || 0,
        likes: blog.likes || 0,
        seo: blog.seo
          ? {
              metaTitle:
                blog.seo.metaTitle?.[locale] || blog.seo.metaTitle?.en || "",
              metaDescription:
                blog.seo.metaDescription?.[locale] ||
                blog.seo.metaDescription?.en ||
                "",
              keywords:
                blog.seo.keywords
                  ?.map((keyword) =>
                    typeof keyword === "string"
                      ? keyword
                      : keyword[locale] || keyword.en || ""
                  )
                  .filter(Boolean) || [],
            }
          : undefined,
        publishedAt: blog.publishedAt || blog.createdAt,
        scheduledFor: blog.scheduledFor,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
      };
    } catch (error) {
      console.error("Error transforming blog:", error);
      return null;
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
}

export { BlogController };
