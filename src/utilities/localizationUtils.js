/**
 * Centralized localization utilities for the booking website backend
 * Provides consistent localization handling across all controllers
 */

/**
 * Get localized value with fallback chain
 * @param {Object} field - The localized field object
 * @param {string} locale - The requested locale (en, es, fr)
 * @returns {string} - The localized value or fallback
 */
export const getLocalizedValue = (field, locale = "en") => {
  if (!field || typeof field !== "object") return field || "";

  // Try requested locale first, then fallback chain
  return (
    field[locale] ||
    field.en ||
    field.es ||
    field.fr ||
    field[Object.keys(field)[0]] ||
    ""
  );
};

/**
 * Get localized value for aggregation with MongoDB $ifNull fallback
 * @param {string} fieldPath - The field path (e.g., "$category", "$features")
 * @param {string} locale - The requested locale
 * @returns {Object} - MongoDB aggregation expression
 */
export const getLocalizedAggregationValue = (fieldPath, locale = "en") => {
  return {
    $ifNull: [
      `${fieldPath}.${locale}`,
      {
        $ifNull: [
          `${fieldPath}.en`,
          {
            $ifNull: [
              `${fieldPath}.es`,
              {
                $ifNull: [
                  `${fieldPath}.fr`,
                  { $arrayElemAt: [{ $objectToArray: fieldPath }, 0] },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
};

/**
 * Transform blog object with localization
 * @param {Object} blog - The blog object
 * @param {string} locale - The requested locale
 * @returns {Object} - Transformed blog object
 */
export const transformBlog = (blog, locale = "en") => {
  if (!blog) return null;

  try {
    return {
      ...blog,
      _id: blog._id.toString(),
      title: getLocalizedValue(blog.title, locale),
      excerpt: getLocalizedValue(blog.excerpt, locale),
      content: getLocalizedValue(blog.content, locale),
      category: getLocalizedValue(blog.category, locale),
      tags: blog.tags?.map((tag) => getLocalizedValue(tag, locale)) || [],
      image: blog.image
        ? {
          ...blog.image,
          alt: getLocalizedValue(blog.image.alt, locale),
          caption: getLocalizedValue(blog.image.caption, locale),
        }
        : null,
      seo: blog.seo
        ? {
          metaTitle: getLocalizedValue(blog.seo.metaTitle, locale),
          metaDescription: getLocalizedValue(
            blog.seo.metaDescription,
            locale
          ),
          keywords:
            blog.seo.keywords?.map((keyword) =>
              getLocalizedValue(keyword, locale)
            ) || [],
        }
        : null,
      slug: getLocalizedValue(blog.slug, locale),
    };
  } catch (error) {
    console.error("Error in transformBlog:", error);
    return {
      ...blog,
      _id: blog._id.toString(),
    };
  }
};

// 3. Alternative: Don't transform for admin - return raw data
export const transformBlogForAdmin = (blog) => {
  if (!blog) return null;

  return {
    ...blog,
    _id: blog._id?.toString() || blog._id,
  };
};

/**
 * Transform tour object with localization
 * @param {Object} tour - The tour object
 * @param {string} locale - The requested locale
 * @returns {Object} - Transformed tour object
 */
export const transformTour = (tour, locale = "en") => {
  if (!tour) return null;

  const transformed = { ...tour };

  // Transform basic fields
  transformed.title = getLocalizedValue(tour.title, locale);
  transformed.slug = getLocalizedValue(tour.slug, locale);
  transformed.description = getLocalizedValue(tour.description, locale);
  transformed.category = getLocalizedValue(tour.category, locale);
  transformed.historyBrief = getLocalizedValue(tour.historyBrief, locale);

  // Transform location
  transformed.location = {
    from: getLocalizedValue(tour.location?.from, locale),
    to: getLocalizedValue(tour.location?.to, locale),
  };

  if (tour.tourLanguage) {
    transformed.tourLanguage = {
      ...tour.tourLanguage,
      description: getLocalizedValue(tour.tourLanguage.description, locale),
    };
  }

  // Transform freeCancelation
  if (tour.freeCancelation) {
    transformed.freeCancelation = {
      note: getLocalizedValue(tour.freeCancelation.note, locale),
      description: getLocalizedValue(tour.freeCancelation.description, locale),
    };
  }

  // Transform refundPolicy with notePolicy
  if (tour.refundPolicy && Array.isArray(tour.refundPolicy)) {
    transformed.refundPolicy = tour.refundPolicy.map((policy) => ({
      ...policy,
      notePolicy: policy.notePolicy
        ? getLocalizedValue(policy.notePolicy, locale)
        : undefined,
    }));
  }

  // Transform arrays
  if (tour?.features) {
    transformed.features = tour.features?.map((feature) =>
      getLocalizedValue(feature, locale)
    );
  }

  if (tour.includes) {
    transformed.includes = tour.includes.map((include) =>
      getLocalizedValue(include, locale)
    );
  }

  if (tour.notIncludes) {
    transformed.notIncludes = tour.notIncludes.map((notInclude) =>
      getLocalizedValue(notInclude, locale)
    );
  }

  if (tour.tags) {
    transformed.tags = tour.tags.map((tag) => getLocalizedValue(tag, locale));
  }

  // Transform options
  if (tour.options) {
    transformed.options = tour.options.map((option) => ({
      ...option,
      _id: option._id,
      name: getLocalizedValue(option.name, locale),
    }));
  }

  // Transform itinerary
  if (tour.itinerary) {
    transformed.itinerary = tour.itinerary.map((item) =>
      getLocalizedValue(item, locale)
    );
  }

  // Transform destination
  if (tour.destination) {
    transformed.destination = {
      ...tour.destination,
      slug: {
        city: getLocalizedValue(tour.destination?.slug?.city, locale),
        country: getLocalizedValue(tour.destination?.slug?.country, locale),
      },
      city: getLocalizedValue(tour.destination.city, locale),
      country: getLocalizedValue(tour.destination.country, locale),
      description: getLocalizedValue(tour.destination.description, locale),
    };
  }

  return transformed;
};

/**
 * Transform destination object with localization
 * @param {Object} destination - The destination object
 * @param {string} locale - The requested locale
 * @returns {Object} - Transformed destination object
 */
export const transformDestination = (destination, locale = "en") => {
  if (!destination) return null;

  return {
    ...destination,
    city: getLocalizedValue(destination.city, locale),
    slug: {
      city: getLocalizedValue(destination?.slug?.city, locale),
      country: getLocalizedValue(destination?.slug?.country, locale),
    },
    country: getLocalizedValue(destination.country, locale),
    description: getLocalizedValue(destination.description, locale),
  };
};

/**
 * Transform multiple tours
 * @param {Array} tours - Array of tour objects
 * @param {string} locale - The requested locale
 * @returns {Array} - Array of transformed tour objects
 */
export const transformTours = (tours, locale = "en") => {
  if (!Array.isArray(tours)) return [];
  return tours.map((tour) => transformTour(tour, locale));
};

/**
 * Transform multiple destinations
 * @param {Array} destinations - Array of destination objects
 * @param {string} locale - The requested locale
 * @returns {Array} - Array of transformed destination objects
 */
export const transformDestinations = (destinations, locale = "en") => {
  if (!Array.isArray(destinations)) return [];
  return destinations.map((destination) =>
    transformDestination(destination, locale)
  );
};

/**
 * Validate locale parameter
 * @param {string} locale - The locale to validate
 * @returns {boolean} - Whether the locale is valid
 */
export const isValidLocale = (locale) => {
  const validLocales = ["en", "es", "fr"];
  return validLocales.includes(locale);
};

/**
 * Get supported locales
 * @returns {Array} - Array of supported locale codes
 */
export const getSupportedLocales = () => {
  return ["en", "es", "fr"];
};

/**
 * Build localized search query for MongoDB
 * @param {string} keyword - The search keyword
 * @param {string} locale - The requested locale
 * @param {Array} fields - Array of field names to search
 * @returns {Object} - MongoDB search query
 */
export const buildLocalizedSearchQuery = (
  keyword,
  locale = "en",
  fields = []
) => {
  const regex = new RegExp(keyword, "i");
  const searchFields =
    fields.length > 0
      ? fields
      : ["title", "description", "category", "country", "city"];

  return {
    $or: searchFields.map((field) => ({
      [`${field}.${locale}`]: regex,
    })),
  };
};

/**
 * Build localized category search query
 * @param {string} category - The category to search
 * @param {string} locale - The requested locale
 * @returns {Object} - MongoDB search query
 */
export const buildCategorySearchQuery = (category, locale = "en") => {
  const regex = new RegExp(category, "i");
  const supportedLocales = getSupportedLocales();

  return {
    $or: supportedLocales.map((lang) => ({
      [`category.${lang}`]: regex,
    })),
  };
};
