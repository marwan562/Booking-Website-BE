export class ApiFeature {
  constructor(mongoseQuery, queryString) {
    this.mongoseQuery = mongoseQuery;
    this.queryString = queryString;
  }

  paginate() {
    let page = this.queryString.page * 1 || 1;
    if (page <= 0) page = 1;
    this.page = page;
    const skip = (page - 1) * 10;
    this.mongoseQuery.skip(skip).limit(10);
    return this;
  }

  filter() {
    let filterobj = { ...this.queryString };
    const excludeQuary = ["page", "sort", "fields", "keyword", "limit"];
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

  sort() {
    if (this.queryString.sort) {
      let sortedBy = this.queryString.sort.split(",").join(" ");
      this.mongoseQuery.sort(sortedBy);
    } else {
      // Optimized default sorting
      this.mongoseQuery.sort({ createdAt: -1, index: 1 });
    }
    return this;
  }

  search() {
    if (this.queryString.keyword) {
      const keyword = this.queryString.keyword;

      const searchQuery = {
        $or: [
          { title: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
          { category: { $regex: keyword, $options: "i" } },
          { tags: { $in: [new RegExp(keyword, "i")] } },
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
    const countQuery = this.mongoseQuery.model.find();

    if (this.queryString.keyword) {
      const keyword = this.queryString.keyword;
      countQuery.find({
        $or: [
          { title: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
          { category: { $regex: keyword, $options: "i" } },
          { tags: { $in: [new RegExp(keyword, "i")] } },
        ],
      });
    }

    return await countQuery.countDocuments();
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
