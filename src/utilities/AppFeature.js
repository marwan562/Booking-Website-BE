export class ApiFeature {
  constructor(mongoseQuery, queryString) {
    this.mongoseQuery = mongoseQuery;
    this.queryString = queryString;
    // Set default limit and ensure it's a number
    this.limit = parseInt(this.queryString.limit) || 10;
    this.page = parseInt(this.queryString.page) || 1;
  }

  paginate() {
    let page = this.page;
    if (page <= 0) page = 1;
    this.page = page;

    const skip = (page - 1) * this.limit;
    this.mongoseQuery.skip(skip).limit(this.limit);
    return this;
  }

  filter() {
    let filterobj = { ...this.queryString };
    const excludeQuary = [
      "page",
      "sort",
      "fields",
      "keyword",
      "limit",
      "locale",
      "category",
    ];
    excludeQuary.forEach((q) => {
      delete filterobj[q];
    });

    filterobj = JSON.stringify(filterobj);
    filterobj = filterobj.replace(
      /\b(gt|gte|lt|lte|in|nin|exists|regex)\b/g,
      (math) => `$${math}`
    );
    filterobj = JSON.parse(filterobj);

    // Add date range filtering if provided
    if (this.queryString.dateFrom || this.queryString.dateTo) {
      filterobj.createdAt = {};
      if (this.queryString.dateFrom) {
        filterobj.createdAt.$gte = new Date(this.queryString.dateFrom);
      }
      if (this.queryString.dateTo) {
        filterobj.createdAt.$lte = new Date(this.queryString.dateTo);
      }
    }

    this.mongoseQuery.find(filterobj);
    return this;
  }

  sort(defaultSort) {
    if (this.queryString.sort) {
      let sortedBy = this.queryString.sort.split(",").join(" ");
      this.mongoseQuery.sort(sortedBy);
    } else if (defaultSort) {
      // Allow custom default sorting
      this.mongoseQuery.sort(defaultSort);
    } else {
      // Optimized default sorting
      this.mongoseQuery.sort({ createdAt: -1, index: 1 });
    }
    return this;
  }
  search() {
    if (this.queryString.keyword) {
      const keyword = this.queryString.keyword;
      const locale =
        this.queryString.locale === "all"
          ? "en"
          : this.queryString.locale || "en";
      const regex = new RegExp(keyword, "i");
      const searchQuery = {
        $or: [
          { [`title.${locale}`]: regex },
          { [`description.${locale}`]: regex },
          { [`category.${locale}`]: regex },
          { [`country.${locale}`]: regex },
          { [`city.${locale}`]: regex },
          { bookingReference: regex },
          { name: regex },
          { lastname: regex },
          { email: regex },
        ],
      };

      this.mongoseQuery.find(searchQuery);
    }

    if (this.queryString.category) {
      const category = this.queryString.category;
      const locale = this.queryString.locale || "en";
      const regex = new RegExp(category, "i");
      const searchQuery = {
        $or: [
          { [`category.en`]: regex },
          { [`category.ar`]: regex },
          { [`category.es`]: regex },
        ],
      };
      this.mongoseQuery.find(searchQuery);
    }
    return this;
  }

  fields() {
    if (this.queryString.fields) {
      let fields = this.queryString.fields.split(",").join(" ");
      this.mongoseQuery.select(fields);
    }
    return this;
  }

  // Add lean query optimization
  lean() {
    this.mongoseQuery = this.mongoseQuery.lean();
    return this;
  }

  async getTotalCount() {
    const locale = this.queryString.locale || "en";
    const keyword = this.queryString.keyword;
    const category = this.queryString.category;
    const regexKeyword = keyword ? new RegExp(keyword, "i") : null;
    const regexCategory = category ? new RegExp(category, "i") : null;

    const filter = {};

    // Add search conditions
    if (regexKeyword) {
      filter.$or = [
        { [`title.${locale}`]: regexKeyword },
        { [`description.${locale}`]: regexKeyword },
        { [`category.${locale}`]: regexKeyword },
        { [`country.${locale}`]: regexKeyword },
        { [`city.${locale}`]: regexKeyword },
        { bookingReference: regexKeyword },
      ];
    }

    // Add category filter if provided
    if (regexCategory) {
      // Merge with existing $or if already set
      if (filter.$or) {
        filter.$or.push({ [`category.${locale}`]: regexCategory });
      } else {
        filter.$or = [{ [`category.${locale}`]: regexCategory }];
      }
    }

    return await this.mongoseQuery.model.countDocuments(filter);
  }

  getPaginationMeta(totalCount) {
    const totalPages = Math.ceil(totalCount / this.limit);
    const hasNextPage = this.page < totalPages;
    const hasPrevPage = this.page > 1;

    return {
      currentPage: this.page,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: this.limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? this.page + 1 : null,
      prevPage: hasPrevPage ? this.page - 1 : null,
    };
  }
}
